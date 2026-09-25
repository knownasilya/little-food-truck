import { zValidator } from "@hono/zod-validator";
import {
  accountUpdateSchema,
  cateringStatus,
  defaultLocationSchema,
  locationUpdateSchema,
  MAX_WATCH_LOCATIONS,
  menuItemInputSchema,
  postInputSchema,
  pushSubscriptionSchema,
  reviewReplySchema,
  scheduleEntryInputSchema,
  truckProfileSchema,
  waitTimeSchema,
  watchLocationInputSchema,
} from "@little-food-truck/shared";
import { and, count, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  cateringRequests,
  customerProfiles,
  favorites,
  menuItems,
  notifications,
  pushSubscriptions,
  reviews,
  scheduleEntries,
  truckPhotos,
  truckPosts,
  truckProfiles,
  users,
  watchLocations,
} from "../db/schema.js";
import { requireAuth, requireRole, withAuth } from "../lib/auth.js";
import { createApp } from "../lib/context.js";
import { newId } from "../lib/id.js";
import { notifyNearbyFavorites } from "../lib/notify.js";
import { resolveTodayLocation } from "../lib/schedule-location.js";
import { getTruck, getTrucksByIds, parseDietaryTags } from "../lib/trucks.js";
import { saveImageUpload } from "../lib/uploads.js";
import { parseActiveDays } from "../lib/watch-locations.js";

const menuItemFormSchema = menuItemInputSchema.extend({
  photo: z.instanceof(File).optional(),
});
const postFormSchema = postInputSchema.extend({
  photo: z.instanceof(File).optional(),
});
const photoFormSchema = z.object({ photo: z.instanceof(File) });

export const meRoute = createApp()
  .use(withAuth)
  .use(requireAuth)
  .get("/", async (c) => {
    const userId = c.var.userId!;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new HTTPException(404, { message: "User not found" });

    const base = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
    };

    if (user.role === "truck") {
      const [profile] = await db
        .select()
        .from(truckProfiles)
        .where(eq(truckProfiles.userId, userId));
      const truckProfile = profile
        ? { ...profile, locationUpdatedAt: profile.locationUpdatedAt?.toISOString() ?? null }
        : null;
      return c.json({ ...base, truckProfile });
    }

    const [profile] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId));
    return c.json({ ...base, customerProfile: profile ?? null });
  })
  .patch("/account", zValidator("json", accountUpdateSchema), async (c) => {
    const userId = c.var.userId!;
    const role = c.var.role;
    const input = c.req.valid("json");
    await db.update(users).set({ displayName: input.displayName }).where(eq(users.id, userId));
    if (role === "customer" && input.timezone) {
      await db
        .update(customerProfiles)
        .set({ timezone: input.timezone })
        .where(eq(customerProfiles.userId, userId));
    }
    return c.json({ ok: true });
  })
  .post("/avatar", zValidator("form", photoFormSchema), async (c) => {
    const userId = c.var.userId!;
    const { photo } = c.req.valid("form");
    const url = await saveImageUpload(photo, "avatars");
    await db.update(users).set({ avatarUrl: url }).where(eq(users.id, userId));
    return c.json({ avatarUrl: url });
  })
  .patch(
    "/truck-profile",
    requireRole("truck"),
    zValidator("json", truckProfileSchema.partial()),
    async (c) => {
      const userId = c.var.userId!;
      const { website, phone, state, ...rest } = c.req.valid("json");
      const updates: Partial<typeof truckProfiles.$inferInsert> = { ...rest };

      // Normalize here rather than in the schema: empty string clears the
      // field, and a bare domain (e.g. "tacocomet.com") gets an "https://"
      // prefix so it always renders as a real link on the public page.
      if (website !== undefined) {
        const trimmed = website.trim();
        updates.website = trimmed ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : null;
      }
      if (phone !== undefined) {
        const trimmed = phone.trim();
        updates.phone = trimmed || null;
      }
      if (state !== undefined) {
        updates.state = state || null;
      }

      await db.update(truckProfiles).set(updates).where(eq(truckProfiles.userId, userId));
      return c.json(await getTruck(userId));
    },
  )
  .post(
    "/truck-profile/photo",
    requireRole("truck"),
    zValidator("form", photoFormSchema),
    async (c) => {
      const userId = c.var.userId!;
      const { photo } = c.req.valid("form");
      const url = await saveImageUpload(photo, "truck-cover");
      await db.update(truckProfiles).set({ photoUrl: url }).where(eq(truckProfiles.userId, userId));
      return c.json({ photoUrl: url });
    },
  )
  .post(
    "/truck-profile/default-location",
    requireRole("truck"),
    zValidator("json", defaultLocationSchema),
    async (c) => {
      const userId = c.var.userId!;
      const { label, lat, lng } = c.req.valid("json");
      await db
        .update(truckProfiles)
        .set({ defaultLocationLabel: label, defaultLat: lat, defaultLng: lng })
        .where(eq(truckProfiles.userId, userId));
      return c.json({ ok: true });
    },
  )
  .delete("/truck-profile/default-location", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .update(truckProfiles)
      .set({ defaultLocationLabel: null, defaultLat: null, defaultLng: null })
      .where(eq(truckProfiles.userId, userId));
    return c.json({ ok: true });
  })
  .post(
    "/location",
    requireRole("truck"),
    zValidator("json", locationUpdateSchema),
    async (c) => {
      const userId = c.var.userId!;
      const input = c.req.valid("json");
      let { lat, lng } = input;

      // Opening without a live GPS fix (no location service, permission
      // denied, ...) falls back to today's schedule location or the
      // truck's default location instead of just failing — see
      // lib/schedule-location.ts. Closing never needs a position at all.
      if (input.isOpen && (lat == null || lng == null)) {
        const resolved = await resolveTodayLocation(userId);
        if (!resolved) {
          throw new HTTPException(400, {
            message:
              "No location available. Enable location services, or set a location in your weekly schedule or a default location.",
          });
        }
        lat = resolved.lat;
        lng = resolved.lng;
      }

      await db
        .update(truckProfiles)
        .set({
          ...(lat != null && lng != null ? { lat, lng } : {}),
          isOpen: input.isOpen,
          locationUpdatedAt: new Date(),
        })
        .where(eq(truckProfiles.userId, userId));

      const truck = await getTruck(userId);
      if (truck && truck.lat != null && truck.lng != null) {
        await notifyNearbyFavorites({
          truckId: truck.id,
          truckName: truck.name,
          truckLat: truck.lat,
          truckLng: truck.lng,
          isOpen: input.isOpen,
        });
      }

      return c.json(truck);
    },
  )
  // --- Watch locations: multiple named spots (Home, Work, ...) a customer
  // wants "truck nearby" notifications for, each with its own radius and
  // optional active time window. Replaces the old single home location +
  // one watch radius on customerProfiles.
  .get("/watch-locations", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    const rows = await db
      .select()
      .from(watchLocations)
      .where(eq(watchLocations.customerId, userId))
      .orderBy(watchLocations.createdAt);
    const out = rows.map((row) => ({
      ...row,
      activeDays: parseActiveDays(row.activeDays),
      createdAt: row.createdAt.toISOString(),
    }));
    return c.json(out);
  })
  .post(
    "/watch-locations",
    requireRole("customer"),
    zValidator("json", watchLocationInputSchema),
    async (c) => {
      const userId = c.var.userId!;
      const input = c.req.valid("json");

      const [existing] = await db
        .select({ count: count() })
        .from(watchLocations)
        .where(eq(watchLocations.customerId, userId));
      if ((existing?.count ?? 0) >= MAX_WATCH_LOCATIONS) {
        throw new HTTPException(400, {
          message: `You can save up to ${MAX_WATCH_LOCATIONS} locations.`,
        });
      }

      const { activeDays, ...rest } = input;
      await db.insert(watchLocations).values({
        id: newId(),
        customerId: userId,
        ...rest,
        activeDays: activeDays.join(","),
      });
      return c.json({ ok: true }, 201);
    },
  )
  .delete("/watch-locations/:id", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    await db
      .delete(watchLocations)
      .where(
        and(eq(watchLocations.id, c.req.param("id")), eq(watchLocations.customerId, userId)),
      );
    return c.json({ ok: true });
  })
  .get("/favorites", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    const rows = await db
      .select({ truckId: favorites.truckId })
      .from(favorites)
      .where(eq(favorites.customerId, userId));
    return c.json(await getTrucksByIds(rows.map((r) => r.truckId)));
  })
  .get("/notifications", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    const rows = await db
      .select({
        id: notifications.id,
        truckId: notifications.truckId,
        truckName: truckProfiles.name,
        message: notifications.message,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .innerJoin(truckProfiles, eq(truckProfiles.userId, notifications.truckId))
      .where(eq(notifications.customerId, userId))
      .orderBy(desc(notifications.createdAt));
    const out = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      readAt: r.readAt?.toISOString() ?? null,
    }));
    return c.json(out);
  })
  .post("/notifications/:id/read", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, c.req.param("id")), eq(notifications.customerId, userId)));
    return c.json({ ok: true });
  })
  .post(
    "/push-subscription",
    requireRole("customer"),
    zValidator("json", pushSubscriptionSchema),
    async (c) => {
      const userId = c.var.userId!;
      const input = c.req.valid("json");
      const [existing] = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint));
      if (existing) {
        await db
          .update(pushSubscriptions)
          .set({ userId, p256dh: input.keys.p256dh, auth: input.keys.auth })
          .where(eq(pushSubscriptions.id, existing.id));
      } else {
        await db.insert(pushSubscriptions).values({
          id: newId(),
          userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        });
      }
      return c.json({ ok: true }, 201);
    },
  )
  .delete(
    "/push-subscription",
    requireRole("customer"),
    zValidator("json", z.object({ endpoint: z.string().url() })),
    async (c) => {
      const { endpoint } = c.req.valid("json");
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      return c.json({ ok: true });
    },
  )
  // --- Truck content management: photos, menu, schedule, posts ---
  .post("/photos", requireRole("truck"), zValidator("form", photoFormSchema), async (c) => {
    const userId = c.var.userId!;
    const { photo } = c.req.valid("form");
    const url = await saveImageUpload(photo, "truck-photos");
    await db.insert(truckPhotos).values({ id: newId(), truckId: userId, url });
    return c.json({ ok: true }, 201);
  })
  .delete("/photos/:id", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .delete(truckPhotos)
      .where(and(eq(truckPhotos.id, c.req.param("id")), eq(truckPhotos.truckId, userId)));
    return c.json({ ok: true });
  })
  .post(
    "/menu-items",
    requireRole("truck"),
    zValidator("form", menuItemFormSchema),
    async (c) => {
      const userId = c.var.userId!;
      const { photo, dietaryTags, ...input } = c.req.valid("form");
      const photoUrl = photo ? await saveImageUpload(photo, "menu-items") : null;
      await db.insert(menuItems).values({
        id: newId(),
        truckId: userId,
        ...input,
        photoUrl,
        dietaryTags: dietaryTags.join(","),
      });
      return c.json({ ok: true }, 201);
    },
  )
  .patch(
    "/menu-items/:id",
    requireRole("truck"),
    zValidator("form", menuItemFormSchema.partial()),
    async (c) => {
      const userId = c.var.userId!;
      const { photo, dietaryTags, ...input } = c.req.valid("form");
      const photoUrl = photo ? await saveImageUpload(photo, "menu-items") : undefined;
      await db
        .update(menuItems)
        .set({
          ...input,
          ...(photoUrl ? { photoUrl } : {}),
          ...(dietaryTags !== undefined ? { dietaryTags: dietaryTags.join(",") } : {}),
        })
        .where(and(eq(menuItems.id, c.req.param("id")), eq(menuItems.truckId, userId)));
      return c.json({ ok: true });
    },
  )
  .delete("/menu-items/:id", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .delete(menuItems)
      .where(and(eq(menuItems.id, c.req.param("id")), eq(menuItems.truckId, userId)));
    return c.json({ ok: true });
  })
  .post(
    "/schedule",
    requireRole("truck"),
    zValidator("json", scheduleEntryInputSchema),
    async (c) => {
      const userId = c.var.userId!;
      const input = c.req.valid("json");
      const dayOfWeek = input.dayOfWeek ?? new Date(`${input.eventDate}T00:00:00Z`).getUTCDay();
      await db.insert(scheduleEntries).values({ id: newId(), truckId: userId, ...input, dayOfWeek });
      return c.json({ ok: true }, 201);
    },
  )
  .delete("/schedule/:id", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .delete(scheduleEntries)
      .where(and(eq(scheduleEntries.id, c.req.param("id")), eq(scheduleEntries.truckId, userId)));
    return c.json({ ok: true });
  })
  // Clears just the lat/lng off a schedule entry (keeps the day/time/label)
  // — separate from deleting the whole entry, e.g. to fall back to
  // resolveTodayLocation() picking the default location for that slot
  // instead.
  .delete("/schedule/:id/location", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .update(scheduleEntries)
      .set({ lat: null, lng: null })
      .where(and(eq(scheduleEntries.id, c.req.param("id")), eq(scheduleEntries.truckId, userId)));
    return c.json({ ok: true });
  })
  .post("/posts", requireRole("truck"), zValidator("form", postFormSchema), async (c) => {
    const userId = c.var.userId!;
    const { photo, message } = c.req.valid("form");
    const photoUrl = photo ? await saveImageUpload(photo, "posts") : null;
    await db.insert(truckPosts).values({ id: newId(), truckId: userId, message, photoUrl });
    return c.json({ ok: true }, 201);
  })
  .delete("/posts/:id", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    await db
      .delete(truckPosts)
      .where(and(eq(truckPosts.id, c.req.param("id")), eq(truckPosts.truckId, userId)));
    return c.json({ ok: true });
  })
  // --- Wait time (truck-set queue estimate, shown while open) ---
  .post("/wait-time", requireRole("truck"), zValidator("json", waitTimeSchema), async (c) => {
    const userId = c.var.userId!;
    const { waitMinutes } = c.req.valid("json");
    await db.update(truckProfiles).set({ waitMinutes }).where(eq(truckProfiles.userId, userId));
    return c.json({ ok: true });
  })
  // --- Review replies (truck owner responding to a customer review) ---
  .patch(
    "/reviews/:id/reply",
    requireRole("truck"),
    zValidator("json", reviewReplySchema),
    async (c) => {
      const userId = c.var.userId!;
      const { reply } = c.req.valid("json");
      const [review] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.truckId, userId)));
      if (!review) throw new HTTPException(404, { message: "Review not found" });

      await db
        .update(reviews)
        .set({ ownerReply: reply, ownerRepliedAt: new Date() })
        .where(eq(reviews.id, review.id));
      return c.json({ ok: true });
    },
  )
  .delete("/reviews/:id/reply", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    const result = await db
      .update(reviews)
      .set({ ownerReply: null, ownerRepliedAt: null })
      .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.truckId, userId)))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  // A truck flagging a review of itself for admin attention — see
  // routes/admin.ts (a flagged review can be dismissed or deleted from
  // /admin). Flagging never hides the review on its own.
  .post("/reviews/:id/flag", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    const result = await db
      .update(reviews)
      .set({ flaggedAt: new Date() })
      .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.truckId, userId)))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  .delete("/reviews/:id/flag", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    const result = await db
      .update(reviews)
      .set({ flaggedAt: null })
      .where(and(eq(reviews.id, c.req.param("id")), eq(reviews.truckId, userId)))
      .returning({ id: reviews.id });
    if (result.length === 0) throw new HTTPException(404, { message: "Review not found" });
    return c.json({ ok: true });
  })
  // --- Catering / private booking requests (submitted publicly, managed here) ---
  .get("/catering-requests", requireRole("truck"), async (c) => {
    const userId = c.var.userId!;
    const rows = await db
      .select()
      .from(cateringRequests)
      .where(eq(cateringRequests.truckId, userId))
      .orderBy(desc(cateringRequests.createdAt));
    const out = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    return c.json(out);
  })
  .patch(
    "/catering-requests/:id",
    requireRole("truck"),
    zValidator("json", z.object({ status: cateringStatus })),
    async (c) => {
      const userId = c.var.userId!;
      const { status } = c.req.valid("json");
      await db
        .update(cateringRequests)
        .set({ status })
        .where(
          and(
            eq(cateringRequests.id, c.req.param("id")),
            eq(cateringRequests.truckId, userId),
          ),
        );
      return c.json({ ok: true });
    },
  )
  // --- Combined feed: recent updates from every truck the customer favorited ---
  .get("/feed", requireRole("customer"), async (c) => {
    const userId = c.var.userId!;
    const rows = await db
      .select({
        id: truckPosts.id,
        truckId: truckPosts.truckId,
        message: truckPosts.message,
        photoUrl: truckPosts.photoUrl,
        createdAt: truckPosts.createdAt,
        truckName: truckProfiles.name,
        truckPhotoUrl: truckProfiles.photoUrl,
      })
      .from(truckPosts)
      .innerJoin(favorites, eq(favorites.truckId, truckPosts.truckId))
      .innerJoin(truckProfiles, eq(truckProfiles.userId, truckPosts.truckId))
      .where(eq(favorites.customerId, userId))
      .orderBy(desc(truckPosts.createdAt))
      .limit(50);
    const out = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    return c.json(out);
  });
