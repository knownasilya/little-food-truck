import { zValidator } from "@hono/zod-validator";
import {
  cateringRequestInputSchema,
  cuisineType,
  dietaryTag,
  reviewSchema,
  truckSortType,
  usStateCode,
} from "@little-food-truck/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db/client.js";
import { cateringRequests, favorites, reviews, users } from "../db/schema.js";
import { requireRole, withAuth } from "../lib/auth.js";
import { createApp } from "../lib/context.js";
import { newId } from "../lib/id.js";
import {
  DEFAULT_PAGE_SIZE,
  getTruck,
  getTruckDetail,
  incrementTruckView,
  listTrucks,
} from "../lib/trucks.js";

const listQuerySchema = z.object({
  cuisine: cuisineType.optional(),
  state: usStateCode.optional(),
  q: z.string().optional(),
  openOnly: z.coerce.boolean().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusMiles: z.coerce.number().optional(),
  sort: truckSortType.optional(),
  // Caps the result with no pagination metadata — for the trending/newest
  // highlight strips (see browse's loadHighlights()). Omit `page` when
  // using this.
  limit: z.coerce.number().int().min(1).max(50).optional(),
  // 1-based — set by the browse page's main list for real pagination.
  // Mutually exclusive with `limit` in practice (never sent together).
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  // Comma-separated dietary tags, e.g. "vegan,gluten-free" — matches trucks
  // with at least one menu item carrying any of the given tags.
  dietary: z
    .string()
    .optional()
    .transform((v) =>
      v
        ?.split(",")
        .filter((t): t is (typeof dietaryTag.options)[number] =>
          (dietaryTag.options as string[]).includes(t),
        ),
    ),
});

export const trucksRoute = createApp()
  .use(withAuth)
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const near =
      q.lat != null && q.lng != null
        ? { lat: q.lat, lng: q.lng, radiusMiles: q.radiusMiles ?? 10 }
        : undefined;

    const { trucks, total } = await listTrucks({
      cuisine: q.cuisine,
      state: q.state,
      search: q.q,
      openOnly: q.openOnly,
      dietaryTags: q.dietary,
      near,
      sort: q.sort,
      limit: q.limit,
      page: q.page,
      pageSize: q.pageSize,
    });

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
    return c.json({
      trucks,
      total,
      page,
      pageSize,
      hasMore: q.page != null ? page * pageSize < total : false,
    });
  })
  .get("/:id", async (c) => {
    const truck = await getTruckDetail(c.req.param("id"));
    if (!truck) throw new HTTPException(404, { message: "Truck not found" });
    await incrementTruckView(c.req.param("id"));
    return c.json(truck);
  })
  .get("/:id/reviews", async (c) => {
    const truckId = c.req.param("id");
    // flaggedAt is only ever real for the truck viewing its own reviews
    // (dashboard reuses this same endpoint) — never leaked into a
    // customer's view of the public listing.
    const isOwnTruck = c.var.userId === truckId;

    const rows = await db
      .select({
        id: reviews.id,
        truckId: reviews.truckId,
        customerId: reviews.customerId,
        customerName: users.displayName,
        rating: reviews.rating,
        comment: reviews.comment,
        ownerReply: reviews.ownerReply,
        ownerRepliedAt: reviews.ownerRepliedAt,
        flaggedAt: reviews.flaggedAt,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.customerId))
      .where(and(eq(reviews.truckId, truckId), isNull(reviews.hiddenAt)))
      .orderBy(desc(reviews.createdAt));
    const out = rows.map((r) => ({
      ...r,
      ownerRepliedAt: r.ownerRepliedAt?.toISOString() ?? null,
      flaggedAt: isOwnTruck ? (r.flaggedAt?.toISOString() ?? null) : null,
      createdAt: r.createdAt.toISOString(),
    }));
    return c.json(out);
  })
  .post(
    "/:id/reviews",
    requireRole("customer"),
    zValidator("json", reviewSchema),
    async (c) => {
      const truckId = c.req.param("id");
      const customerId = c.var.userId!;
      const input = c.req.valid("json");

      const truck = await getTruck(truckId);
      if (!truck) throw new HTTPException(404, { message: "Truck not found" });

      const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.customerId, customerId), eq(reviews.truckId, truckId)));

      if (existing) {
        await db
          .update(reviews)
          .set({ rating: input.rating, comment: input.comment })
          .where(eq(reviews.id, existing.id));
      } else {
        await db.insert(reviews).values({
          id: newId(),
          truckId,
          customerId,
          rating: input.rating,
          comment: input.comment,
        });
      }

      return c.json({ ok: true }, existing ? 200 : 201);
    },
  )
  .post("/:id/favorite", requireRole("customer"), async (c) => {
    const truckId = c.req.param("id");
    const customerId = c.var.userId!;

    const truck = await getTruck(truckId);
    if (!truck) throw new HTTPException(404, { message: "Truck not found" });

    const [existing] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.customerId, customerId), eq(favorites.truckId, truckId)));
    if (!existing) {
      await db.insert(favorites).values({ id: newId(), customerId, truckId });
    }
    return c.json({ favorited: true });
  })
  .delete("/:id/favorite", requireRole("customer"), async (c) => {
    const truckId = c.req.param("id");
    const customerId = c.var.userId!;
    await db
      .delete(favorites)
      .where(and(eq(favorites.customerId, customerId), eq(favorites.truckId, truckId)));
    return c.json({ favorited: false });
  })
  .post(
    "/:id/catering-request",
    zValidator("json", cateringRequestInputSchema),
    async (c) => {
      const truckId = c.req.param("id");
      const input = c.req.valid("json");

      const truck = await getTruck(truckId);
      if (!truck) throw new HTTPException(404, { message: "Truck not found" });
      if (!truck.claimed) {
        throw new HTTPException(400, {
          message: "This truck hasn't been claimed by its owner yet, so it can't take catering requests.",
        });
      }

      await db.insert(cateringRequests).values({
        id: newId(),
        truckId,
        customerId: c.var.userId ?? null,
        name: input.name,
        email: input.email,
        eventDate: input.eventDate,
        guestCount: input.guestCount ?? null,
        details: input.details,
      });

      return c.json({ ok: true }, 201);
    },
  );
