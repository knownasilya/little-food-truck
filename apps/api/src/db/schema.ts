import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Stub reference to Supabase's own `auth.users` table, managed by Supabase
// Auth (GoTrue) — not by us. Declared only so our tables can foreign-key
// into it; drizzle.config.ts scopes `db:push` to the `public` schema, so
// this is never created/altered here.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// Our own public-facing user row: role, display name, avatar. Auth
// (credentials, sessions, password reset) lives entirely in Supabase's
// auth.users — this table just extends it with our app-specific fields,
// created right after sign-up (see routes/auth.ts).
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["truck", "customer"] }).notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  // Orthogonal to role (truck/customer) — an admin account is still either
  // a truck or a customer underneath, it just also gets access to /admin
  // (see lib/auth.ts#requireAdmin). No self-serve way to become one; set
  // directly in the database (or via db/seed.ts for local dev).
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const truckProfiles = pgTable("truck_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cuisine: text("cuisine").notNull().default("other"),
  photoUrl: text("photo_url"),
  isOpen: boolean("is_open").notNull().default(false),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
  waitMinutes: integer("wait_minutes"),
  viewCount: integer("view_count").notNull().default(0),
  // Set by an admin via /admin — see routes/admin.ts. Purely a badge shown
  // to customers; doesn't gate any functionality a truck can do.
  verified: boolean("verified").notNull().default(false),
  // Fallback spot used to open for business when there's no live GPS fix
  // and no schedule entry for today has its own lat/lng — see
  // lib/schedule-location.ts. All three null means "not set."
  defaultLocationLabel: text("default_location_label"),
  defaultLat: doublePrecision("default_lat"),
  defaultLng: doublePrecision("default_lng"),
  // IANA zone name (e.g. "America/Chicago"). The day-of-week/time-of-day a
  // truck enters on its schedule (schedule_entries.startTime/endTime/
  // dayOfWeek) is implicitly in this zone — resolveTodayLocation() in
  // lib/schedule-location.ts uses it to figure out "today" and "now" from
  // the truck's own perspective rather than the server's.
  timezone: text("timezone").notNull().default("America/Chicago"),
  // Both optional contact info, shown on the truck's public page. Normalized
  // server-side (empty -> null, website gets a scheme prefix if missing) —
  // see the PATCH /me/truck-profile handler in routes/me.ts.
  website: text("website"),
  phone: text("phone"),
});

export const customerProfiles = pgTable("customer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // IANA zone name (e.g. "America/Chicago") — what a customer's own
  // watch-location active windows (watch_locations.startTime/endTime/
  // activeDays) are interpreted in. Editable from /account. Mirrors
  // truck_profiles.timezone, which does the same job for a truck's own
  // schedule — see lib/time.ts#zonedNow, used by both lib/notify.ts (here)
  // and lib/schedule-location.ts (the truck side).
  timezone: text("timezone").notNull().default("America/Chicago"),
});

// Our own short-lived reset tokens, separate from Supabase's own recovery
// flow — keeps the existing /forgot-password + /reset-password?token=...
// pages working unchanged. The actual password mutation still goes through
// Supabase's admin API (see routes/auth.ts), since Supabase Auth now owns
// credential storage.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

// A customer can watch several places (home, work, ...) — each with its own
// radius — instead of one single home location. Superseded the old
// customerProfiles.watchRadiusMiles/homeLat/homeLng columns.
export const watchLocations = pgTable(
  "watch_locations",
  {
    id: uuid("id").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    radiusMiles: doublePrecision("radius_miles").notNull().default(5),
    // Optional active window so a location only notifies at relevant times
    // (e.g. "Work", weekdays 9am-5pm). Empty activeDays = every day; null
    // start/end time = all day. All-empty/null means "always active".
    activeDays: text("active_days").notNull().default(""),
    startTime: text("start_time"),
    endTime: text("end_time"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("watch_locations_customer_idx").on(t.customerId)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("favorites_customer_truck_unique").on(t.customerId, t.truckId),
    index("favorites_truck_idx").on(t.truckId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    ownerReply: text("owner_reply"),
    ownerRepliedAt: timestamp("owner_replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Set by an admin via /admin — see routes/admin.ts. A hidden review is
    // excluded from public listings and from the truck's averageRating /
    // reviewCount (see lib/trucks.ts), but kept in the database (soft
    // moderation, not deletion) so it can be unhidden or audited later.
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    // Set by the truck being reviewed (POST/DELETE /me/reviews/:id/flag) to
    // ask an admin to take a look — e.g. a fake or abusive review. Purely a
    // signal for /admin; doesn't hide the review or otherwise change its
    // public visibility on its own.
    flaggedAt: timestamp("flagged_at", { withTimezone: true }),
  },
  (t) => [
    unique("reviews_customer_truck_unique").on(t.customerId, t.truckId),
    index("reviews_truck_idx").on(t.truckId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("notifications_customer_idx").on(t.customerId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

export const truckPhotos = pgTable(
  "truck_photos",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("truck_photos_truck_idx").on(t.truckId)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: text("price").notNull().default(""),
    photoUrl: text("photo_url"),
    dietaryTags: text("dietary_tags").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("menu_items_truck_idx").on(t.truckId)],
);

export const scheduleEntries = pgTable(
  "schedule_entries",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    eventDate: text("event_date"),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    locationLabel: text("location_label").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("schedule_entries_truck_idx").on(t.truckId)],
);

export const truckPosts = pgTable(
  "truck_posts",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("truck_posts_truck_idx").on(t.truckId)],
);

export const cateringRequests = pgTable(
  "catering_requests",
  {
    id: uuid("id").primaryKey(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    eventDate: text("event_date").notNull(),
    guestCount: integer("guest_count"),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["new", "accepted", "declined"] })
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("catering_requests_truck_idx").on(t.truckId)],
);
