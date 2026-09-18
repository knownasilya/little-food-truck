import { z } from "zod";

export const userRole = z.enum(["truck", "customer"]);
export type UserRole = z.infer<typeof userRole>;

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: userRole,
  displayName: z.string().min(1).max(80),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const cuisineType = z.enum([
  "american",
  "mexican",
  "asian",
  "bbq",
  "dessert",
  "coffee",
  "vegan",
  "seafood",
  "other",
]);
export type CuisineType = z.infer<typeof cuisineType>;

export const truckProfileSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  cuisine: cuisineType,
  // IANA zone name (e.g. "America/Chicago") — see the timezone column
  // comment in apps/api/src/db/schema.ts for what this actually drives.
  timezone: z.string().min(1).max(100),
  // Both optional — empty string clears them. Normalized server-side (see
  // routes/me.ts): website gets an "https://" prefix if missing a scheme,
  // phone is stored as typed (no format enforced, since real-world formats
  // vary too much to validate usefully).
  website: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
});
export type TruckProfileInput = z.infer<typeof truckProfileSchema>;

// A truck's fallback "usually parked here" spot — used to open for business
// when there's no live GPS fix and no schedule entry for today has its own
// location set. See lib/schedule-location.ts.
export const defaultLocationSchema = z.object({
  label: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type DefaultLocationInput = z.infer<typeof defaultLocationSchema>;

export const waitTimeSchema = z.object({
  waitMinutes: z.coerce.number().int().min(0).max(180).nullable(),
});
export type WaitTimeInput = z.infer<typeof waitTimeSchema>;

export const truckSortType = z.enum(["relevant", "rating", "distance", "newest", "trending"]);
export type TruckSortType = z.infer<typeof truckSortType>;

const watchDayOfWeek = z.number().int().min(0).max(6);
const watchTimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

export const MAX_WATCH_LOCATIONS = 3;

export const watchLocationInputSchema = z.object({
  label: z.string().min(1).max(40),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMiles: z.number().min(0.5).max(50).default(5),
  // Empty activeDays = every day; missing start/end time = all day. All
  // three empty/unset means "always active" — the common case (e.g. Home).
  activeDays: z.array(watchDayOfWeek).max(7).optional().default([]),
  startTime: watchTimeOfDay.optional(),
  endTime: watchTimeOfDay.optional(),
});
export type WatchLocationInput = z.infer<typeof watchLocationInputSchema>;

export const watchLocationRecordSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  radiusMiles: z.number(),
  activeDays: z.array(watchDayOfWeek),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  createdAt: z.string(),
});
export type WatchLocationRecord = z.infer<typeof watchLocationRecordSchema>;

export const locationUpdateSchema = z.object({
  // Both optional: closing never needs a position (just a status flip), and
  // opening without one falls back server-side to today's schedule location
  // or the truck's default location — see lib/schedule-location.ts and the
  // /me/location handler in routes/me.ts. Sending both is still how live GPS
  // ("I'm here") reports an exact position when it's available.
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isOpen: z.boolean().default(true),
});
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(""),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const truckSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  cuisine: cuisineType,
  photoUrl: z.string().nullable(),
  isOpen: z.boolean(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  locationUpdatedAt: z.string().nullable(),
  waitMinutes: z.number().nullable(),
  viewCount: z.number(),
  favoriteCount: z.number(),
  averageRating: z.number().nullable(),
  reviewCount: z.number(),
  createdAt: z.string(),
  distanceMiles: z.number().optional(),
  verified: z.boolean(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
});
export type Truck = z.infer<typeof truckSchema>;

export const reviewRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  rating: z.number(),
  comment: z.string(),
  ownerReply: z.string().nullable(),
  ownerRepliedAt: z.string().nullable(),
  createdAt: z.string(),
  // Only ever populated for the truck viewing its own reviews (dashboard) —
  // never leaked to a customer's view of the same public listing endpoint.
  // See the GET /:id/reviews handler in routes/trucks.ts.
  flaggedAt: z.string().nullable().optional(),
});
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;

export const reviewReplySchema = z.object({
  reply: z.string().min(1).max(1000),
});
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;

export const notificationSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  truckName: z.string(),
  message: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type NotificationRecord = z.infer<typeof notificationSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: userRole,
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});
export type PublicUser = z.infer<typeof userSchema>;

export const accountUpdateSchema = z.object({
  displayName: z.string().min(1).max(80),
  // Customer-only (see the PATCH /me/account handler) — IANA zone name, same
  // shape as truckProfileSchema.timezone. Optional since the truck side of
  // this same endpoint has no use for it.
  timezone: z.string().min(1).max(100).optional(),
});
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;

export const dietaryTag = z.enum([
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "spicy",
]);
export type DietaryTag = z.infer<typeof dietaryTag>;
export const DIETARY_TAGS = dietaryTag.options;

// Multipart forms can't carry real arrays, so dietary tags travel as a
// comma-joined string on the wire and get split/filtered back into an array.
const dietaryTagsField = z
  .string()
  .optional()
  .default("")
  .transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is DietaryTag => (dietaryTag.options as string[]).includes(t)),
  );

export const menuItemInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  price: z.string().max(20).optional().default(""),
  dietaryTags: dietaryTagsField,
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export const menuItemRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.string(),
  photoUrl: z.string().nullable(),
  dietaryTags: z.array(dietaryTag),
  createdAt: z.string(),
});
export type MenuItemRecord = z.infer<typeof menuItemRecordSchema>;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const dayOfWeek = z.coerce.number().int().min(0).max(6);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const scheduleEntryInputSchema = z
  .object({
    dayOfWeek: dayOfWeek.optional(),
    eventDate: isoDate.optional(),
    startTime: hhmm,
    endTime: hhmm,
    locationLabel: z.string().min(1).max(120),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((v) => v.dayOfWeek != null || v.eventDate != null, {
    message: "Provide a day of week for a recurring stop, or a specific date for a one-off event",
    path: ["dayOfWeek"],
  });
export type ScheduleEntryInput = z.infer<typeof scheduleEntryInputSchema>;

export const scheduleEntryRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  dayOfWeek: z.number(),
  eventDate: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  locationLabel: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type ScheduleEntryRecord = z.infer<typeof scheduleEntryRecordSchema>;

export const postInputSchema = z.object({
  message: z.string().min(1).max(500),
});
export type PostInput = z.infer<typeof postInputSchema>;

export const truckPostRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  message: z.string(),
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type TruckPostRecord = z.infer<typeof truckPostRecordSchema>;

export const feedPostSchema = truckPostRecordSchema.extend({
  truckName: z.string(),
  truckPhotoUrl: z.string().nullable(),
});
export type FeedPost = z.infer<typeof feedPostSchema>;

export const cateringRequestInputSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  eventDate: isoDate,
  guestCount: z.coerce.number().int().min(1).max(100000).optional(),
  details: z.string().max(2000).optional().default(""),
});
export type CateringRequestInput = z.infer<typeof cateringRequestInputSchema>;

export const cateringStatus = z.enum(["new", "accepted", "declined"]);
export type CateringStatus = z.infer<typeof cateringStatus>;

export const cateringRequestRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  customerId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  eventDate: z.string(),
  guestCount: z.number().nullable(),
  details: z.string(),
  status: cateringStatus,
  createdAt: z.string(),
});
export type CateringRequestRecord = z.infer<typeof cateringRequestRecordSchema>;

export const truckPhotoRecordSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  url: z.string(),
  createdAt: z.string(),
});
export type TruckPhotoRecord = z.infer<typeof truckPhotoRecordSchema>;

export const truckDetailSchema = truckSchema.extend({
  photos: z.array(truckPhotoRecordSchema),
  menu: z.array(menuItemRecordSchema),
  schedule: z.array(scheduleEntryRecordSchema),
  posts: z.array(truckPostRecordSchema),
});
export type TruckDetail = z.infer<typeof truckDetailSchema>;

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Admin-only views — see apps/api/src/routes/admin.ts. Not exposed through
// any public endpoint.
export const adminTruckSchema = z.object({
  id: z.string(),
  name: z.string(),
  cuisine: cuisineType,
  photoUrl: z.string().nullable(),
  ownerEmail: z.string(),
  verified: z.boolean(),
  favoriteCount: z.number(),
  averageRating: z.number().nullable(),
  reviewCount: z.number(),
  createdAt: z.string(),
});
export type AdminTruck = z.infer<typeof adminTruckSchema>;

export const adminReviewSchema = z.object({
  id: z.string(),
  truckId: z.string(),
  truckName: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  rating: z.number(),
  comment: z.string(),
  hiddenAt: z.string().nullable(),
  flaggedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminReview = z.infer<typeof adminReviewSchema>;
