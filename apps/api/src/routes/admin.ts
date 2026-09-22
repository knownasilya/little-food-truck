import { randomBytes } from "node:crypto";
import type { CuisineType } from "@little-food-truck/shared";
import { adminCreateTruckSchema } from "@little-food-truck/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client.js";
import { favorites, reviews, truckClaimRequests, truckProfiles, users } from "../db/schema.js";
import { requireAdmin, requireAuth, withAuth } from "../lib/auth.js";
import { createApp } from "../lib/context.js";
import { emailEnabled, sendClaimApprovedEmail, sendClaimTruckEmail } from "../lib/email.js";
import { env } from "../lib/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { getClaimDocumentUrl } from "../lib/uploads.js";

// How long an admin-issued claim link stays valid — long enough for an
// admin to reach a real owner out of band (phone, in person, ...) and for
// that owner to get around to it, but bounded so a stale, unclaimed
// placeholder doesn't stay claimable forever. Mirrors the
// passwordResetTokens TTL pattern in routes/auth.ts, just longer-lived
// since this isn't a same-session forgot-password flow.
const CLAIM_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SET_PASSWORD_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function issueClaimToken() {
  return {
    claimToken: randomBytes(32).toString("hex"),
    claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
  };
}

function issueSetPasswordToken() {
  return {
    setPasswordToken: randomBytes(32).toString("hex"),
    setPasswordTokenExpiresAt: new Date(Date.now() + SET_PASSWORD_TOKEN_TTL_MS),
  };
}

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
        claimToken: truckProfiles.claimToken,
        claimedAt: truckProfiles.claimedAt,
        claimEmail: truckProfiles.claimEmail,
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

    const pendingCounts = await db
      .select({ truckId: truckClaimRequests.truckId, count: sql<number>`count(*)::int` })
      .from(truckClaimRequests)
      .where(eq(truckClaimRequests.status, "pending"))
      .groupBy(truckClaimRequests.truckId);
    const pendingMap = new Map(pendingCounts.map((p) => [p.truckId, p.count]));

    return c.json(
      rows.map((row) => {
        const stat = reviewMap.get(row.id);
        const claimed = row.claimedAt !== null;
        return {
          id: row.id,
          name: row.name,
          cuisine: row.cuisine as CuisineType,
          photoUrl: row.photoUrl,
          ownerEmail: row.ownerEmail,
          verified: row.verified,
          createdAt: row.createdAt.toISOString(),
          favoriteCount: favoriteMap.get(row.id) ?? 0,
          averageRating: stat ? Number(stat.avg.toFixed(2)) : null,
          reviewCount: stat?.count ?? 0,
          claimed,
          claimEmail: row.claimEmail,
          claimUrl: !claimed && row.claimToken ? `${env.WEB_ORIGIN}/claim?token=${row.claimToken}` : null,
          pendingRequestCount: pendingMap.get(row.id) ?? 0,
        };
      }),
    );
  })
  // Adds an unclaimed truck listing: a full truck account (auth user +
  // users + truck_profiles row) exists immediately, same as any other
  // truck, just signed into by nobody until claimed — see
  // truckProfiles.claimToken's comment in db/schema.ts and routes/claim.ts
  // for the other half of this flow.
  .post("/trucks", zValidator("json", adminCreateTruckSchema), async (c) => {
    const input = c.req.valid("json");
    const { claimToken, claimTokenExpiresAt } = issueClaimToken();

    // Never deliverable (`.invalid` is reserved by RFC 2606 for exactly
    // this — guaranteed to never resolve to a real inbox) and the password
    // is a random value nobody is ever told, so this account can't
    // actually be signed into until claim swaps both out for the real
    // owner's.
    const placeholderEmail = `unclaimed-${randomBytes(8).toString("hex")}@trucks.invalid`;
    const placeholderPassword = randomBytes(24).toString("hex");

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: placeholderEmail,
      password: placeholderPassword,
      email_confirm: true,
      app_metadata: { role: "truck" },
      user_metadata: { displayName: input.name },
    });
    if (error || !data.user) {
      throw new HTTPException(400, { message: error?.message ?? "Could not create truck listing" });
    }
    const userId = data.user.id;

    await db.insert(users).values({
      id: userId,
      email: placeholderEmail,
      role: "truck",
      displayName: input.name,
    });
    await db.insert(truckProfiles).values({
      userId,
      name: input.name,
      description: input.description,
      cuisine: input.cuisine,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      website: input.website || null,
      phone: input.phone || null,
      claimToken,
      claimTokenExpiresAt,
      claimEmail: input.ownerEmail ?? null,
    });

    const claimUrl = `${env.WEB_ORIGIN}/claim?token=${claimToken}`;
    let emailed = false;
    if (input.ownerEmail && emailEnabled) {
      try {
        await sendClaimTruckEmail(input.ownerEmail, input.name, claimUrl);
        emailed = true;
      } catch (err) {
        console.error(`[admin] failed to send claim email to ${input.ownerEmail}`, err);
      }
    }

    return c.json({ id: userId, claimUrl, emailed }, 201);
  })
  // Re-issues a fresh claim link for a truck that's still unclaimed (e.g.
  // the original expired, or the owner lost it) — same creation path as
  // above, minus recreating the account.
  .post("/trucks/:id/resend-claim", async (c) => {
    const truckId = c.req.param("id");
    const [truck] = await db
      .select({ name: truckProfiles.name, claimedAt: truckProfiles.claimedAt, claimEmail: truckProfiles.claimEmail })
      .from(truckProfiles)
      .where(eq(truckProfiles.userId, truckId));
    if (!truck) throw new HTTPException(404, { message: "Truck not found" });
    if (truck.claimedAt) throw new HTTPException(400, { message: "This truck has already been claimed" });

    const { claimToken, claimTokenExpiresAt } = issueClaimToken();
    await db
      .update(truckProfiles)
      .set({ claimToken, claimTokenExpiresAt })
      .where(eq(truckProfiles.userId, truckId));

    const claimUrl = `${env.WEB_ORIGIN}/claim?token=${claimToken}`;
    let emailed = false;
    if (truck.claimEmail && emailEnabled) {
      try {
        await sendClaimTruckEmail(truck.claimEmail, truck.name, claimUrl);
        emailed = true;
      } catch (err) {
        console.error(`[admin] failed to resend claim email to ${truck.claimEmail}`, err);
      }
    }

    return c.json({ claimUrl, emailed });
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
  .get("/claim-requests", async (c) => {
    const rows = await db
      .select({
        id: truckClaimRequests.id,
        truckId: truckClaimRequests.truckId,
        truckName: truckProfiles.name,
        requesterName: truckClaimRequests.requesterName,
        requesterEmail: truckClaimRequests.requesterEmail,
        requesterPhone: truckClaimRequests.requesterPhone,
        message: truckClaimRequests.message,
        status: truckClaimRequests.status,
        proofDocumentPath: truckClaimRequests.proofDocumentPath,
        createdAt: truckClaimRequests.createdAt,
        decidedAt: truckClaimRequests.decidedAt,
      })
      .from(truckClaimRequests)
      .innerJoin(truckProfiles, eq(truckProfiles.userId, truckClaimRequests.truckId))
      // Pending requests need a decision, so they bubble up — same pattern
      // as flagged reviews below.
      .orderBy(sql`${truckClaimRequests.status} = 'pending' desc`, desc(truckClaimRequests.createdAt))
      .limit(200);

    return c.json(
      await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          truckId: row.truckId,
          truckName: row.truckName,
          requesterName: row.requesterName,
          requesterEmail: row.requesterEmail,
          requesterPhone: row.requesterPhone,
          message: row.message,
          status: row.status,
          proofDocumentUrl: await getClaimDocumentUrl(row.proofDocumentPath),
          createdAt: row.createdAt.toISOString(),
          decidedAt: row.decidedAt?.toISOString() ?? null,
        })),
      ),
    );
  })
  // Approving doesn't hand over the account by itself — it emails (or, with
  // no email service configured, hands back directly) a fresh, short-lived
  // link for the *approved* requester specifically to set a password
  // (routes/claim.ts's finish step). truckProfiles.claimToken never grants
  // access on its own; this is the only path that actually does.
  .post("/claim-requests/:id/approve", async (c) => {
    const requestId = c.req.param("id");
    const [request] = await db
      .select({
        id: truckClaimRequests.id,
        status: truckClaimRequests.status,
        requesterEmail: truckClaimRequests.requesterEmail,
        truckId: truckClaimRequests.truckId,
        truckName: truckProfiles.name,
        truckClaimedAt: truckProfiles.claimedAt,
      })
      .from(truckClaimRequests)
      .innerJoin(truckProfiles, eq(truckProfiles.userId, truckClaimRequests.truckId))
      .where(eq(truckClaimRequests.id, requestId));
    if (!request) throw new HTTPException(404, { message: "Claim request not found" });
    if (request.status !== "pending") {
      throw new HTTPException(400, { message: "This request has already been decided" });
    }
    if (request.truckClaimedAt) {
      throw new HTTPException(400, { message: "This truck has already been claimed" });
    }

    const { setPasswordToken, setPasswordTokenExpiresAt } = issueSetPasswordToken();
    await db
      .update(truckClaimRequests)
      .set({ status: "approved", decidedAt: new Date(), setPasswordToken, setPasswordTokenExpiresAt })
      .where(eq(truckClaimRequests.id, requestId));

    const finishUrl = `${env.WEB_ORIGIN}/claim/finish?token=${setPasswordToken}`;
    let emailed = false;
    if (emailEnabled) {
      try {
        await sendClaimApprovedEmail(request.requesterEmail, request.truckName, finishUrl);
        emailed = true;
      } catch (err) {
        console.error(`[admin] failed to send claim-approved email to ${request.requesterEmail}`, err);
      }
    }

    return c.json({ ok: true, finishUrl, emailed });
  })
  .post("/claim-requests/:id/deny", async (c) => {
    const result = await db
      .update(truckClaimRequests)
      .set({ status: "denied", decidedAt: new Date() })
      .where(and(eq(truckClaimRequests.id, c.req.param("id")), eq(truckClaimRequests.status, "pending")))
      .returning({ id: truckClaimRequests.id });
    if (result.length === 0) {
      throw new HTTPException(404, { message: "Claim request not found or already decided" });
    }
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
