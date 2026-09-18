import type { CuisineType } from "@little-food-truck/shared";
import { desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client.js";
import { favorites, reviews, truckProfiles, users } from "../db/schema.js";
import { requireAdmin, requireAuth, withAuth } from "../lib/auth.js";
import { createApp } from "../lib/context.js";

export const adminRoute = createApp()
  .use(withAuth)
  .use(requireAuth)
  .use(requireAdmin)
  .get("/trucks", async (c) => {
    const rows = await db
      .select({
        id: users.id,
        name: truckProfiles.name,
        cuisine: truckProfiles.cuisine,
        photoUrl: truckProfiles.photoUrl,
        ownerEmail: users.email,
        verified: truckProfiles.verified,
        createdAt: users.createdAt,
      })
      .from(truckProfiles)
      .innerJoin(users, eq(users.id, truckProfiles.userId))
      .orderBy(desc(users.createdAt));

    const favoriteCounts = await db
      .select({ truckId: favorites.truckId, count: sql<number>`count(*)::int` })
      .from(favorites)
      .groupBy(favorites.truckId);
    const favoriteMap = new Map(favoriteCounts.map((f) => [f.truckId, f.count]));

    // Includes hidden reviews in the counts here (unlike the public-facing
    // stats in lib/trucks.ts) — an admin reviewing a truck should see the
    // full picture, moderated or not.
    const reviewStats = await db
      .select({
        truckId: reviews.truckId,
        count: sql<number>`count(*)::int`,
        avg: sql<number>`avg(rating)::float`,
      })
      .from(reviews)
      .groupBy(reviews.truckId);
    const reviewMap = new Map(reviewStats.map((r) => [r.truckId, r]));

    return c.json(
      rows.map((row) => {
        const stat = reviewMap.get(row.id);
        return {
          ...row,
          cuisine: row.cuisine as CuisineType,
          createdAt: row.createdAt.toISOString(),
          favoriteCount: favoriteMap.get(row.id) ?? 0,
          averageRating: stat ? Number(stat.avg.toFixed(2)) : null,
          reviewCount: stat?.count ?? 0,
        };
      }),
    );
  })
  .post("/trucks/:id/verify", async (c) => {
    const truckId = c.req.param("id");
    const result = await db
      .update(truckProfiles)
      .set({ verified: true })
      .where(eq(truckProfiles.userId, truckId))
      .returning({ userId: truckProfiles.userId });
    if (result.length === 0) throw new HTTPException(404, { message: "Truck not found" });
    return c.json({ ok: true });
  })
  .post("/trucks/:id/unverify", async (c) => {
    const truckId = c.req.param("id");
    const result = await db
      .update(truckProfiles)
      .set({ verified: false })
      .where(eq(truckProfiles.userId, truckId))
      .returning({ userId: truckProfiles.userId });
    if (result.length === 0) throw new HTTPException(404, { message: "Truck not found" });
    return c.json({ ok: true });
  })
  .get("/reviews", async (c) => {
    const rows = await db
      .select({
        id: reviews.id,
        truckId: reviews.truckId,
        truckName: truckProfiles.name,
        customerId: reviews.customerId,
        rating: reviews.rating,
        comment: reviews.comment,
        hiddenAt: reviews.hiddenAt,
        flaggedAt: reviews.flaggedAt,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(truckProfiles, eq(truckProfiles.userId, reviews.truckId))
      // Flagged reviews (a truck asking for a look) bubble to the top so
      // they're not lost among 200 otherwise-unremarkable ones.
      .orderBy(sql`${reviews.flaggedAt} is null`, desc(reviews.createdAt))
      .limit(200);

    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const customers =
      customerIds.length > 0
        ? await db
            .select({ id: users.id, displayName: users.displayName })
            .from(users)
            .where(sql`${users.id} in ${customerIds}`)
        : [];
    const customerMap = new Map(customers.map((u) => [u.id, u.displayName]));

    return c.json(
      rows.map((r) => ({
        ...r,
        customerName: customerMap.get(r.customerId) ?? "Deleted user",
        hiddenAt: r.hiddenAt?.toISOString() ?? null,
        flaggedAt: r.flaggedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  })
  .post("/reviews/:id/hide", async (c) => {
    const result = await db
      .update(reviews)
      .set({ hiddenAt: new Date() })
      .where(eq(reviews.id, c.req.param("id")))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  .post("/reviews/:id/unhide", async (c) => {
    const result = await db
      .update(reviews)
      .set({ hiddenAt: null })
      .where(eq(reviews.id, c.req.param("id")))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  // "Ignore" a truck's flag — dismisses it without hiding or deleting the
  // review, for when the admin looks and decides there's nothing to do.
  .post("/reviews/:id/ignore-flag", async (c) => {
    const result = await db
      .update(reviews)
      .set({ flaggedAt: null })
      .where(eq(reviews.id, c.req.param("id")))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  // Hard delete — unlike hide (soft, reversible), this permanently removes
  // the review row. Reserved for genuinely bad content (spam, abuse) an
  // admin has actually looked at, typically reached via a flag.
  .delete("/reviews/:id", async (c) => {
    const result = await db
      .delete(reviews)
      .where(eq(reviews.id, c.req.param("id")))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  });
