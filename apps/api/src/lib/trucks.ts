import type {
  CuisineType,
  DietaryTag,
  Truck,
  TruckDetail,
  TruckSortType,
} from "@little-food-truck/shared";
import { distanceMiles } from "@little-food-truck/shared";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  favorites,
  menuItems,
  reviews,
  scheduleEntries,
  truckPhotos,
  truckPosts,
  truckProfiles,
  users,
} from "../db/schema.js";

type TruckRow = {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  photoUrl: string | null;
  isOpen: boolean;
  lat: number | null;
  lng: number | null;
  locationUpdatedAt: Date | null;
  waitMinutes: number | null;
  viewCount: number;
  createdAt: Date;
  verified: boolean;
  website: string | null;
  phone: string | null;
};

function baseQuery() {
  return db
    .select({
      id: users.id,
      name: truckProfiles.name,
      description: truckProfiles.description,
      cuisine: truckProfiles.cuisine,
      photoUrl: truckProfiles.photoUrl,
      isOpen: truckProfiles.isOpen,
      lat: truckProfiles.lat,
      lng: truckProfiles.lng,
      locationUpdatedAt: truckProfiles.locationUpdatedAt,
      waitMinutes: truckProfiles.waitMinutes,
      viewCount: truckProfiles.viewCount,
      createdAt: users.createdAt,
      verified: truckProfiles.verified,
      website: truckProfiles.website,
      phone: truckProfiles.phone,
    })
    .from(truckProfiles)
    .innerJoin(users, eq(users.id, truckProfiles.userId));
}

export function parseDietaryTags(raw: string): DietaryTag[] {
  if (!raw) return [];
  return raw.split(",").filter(Boolean) as DietaryTag[];
}

async function hydrate(rows: TruckRow[]): Promise<Truck[]> {
  if (rows.length === 0) return [];

  const favoriteCounts = await db
    .select({ truckId: favorites.truckId, count: sql<number>`count(*)::int` })
    .from(favorites)
    .groupBy(favorites.truckId);
  const favoriteMap = new Map(favoriteCounts.map((f) => [f.truckId, f.count]));

  // Hidden (admin-moderated) reviews don't count toward the public rating
  // or review count — see routes/admin.ts.
  const reviewStats = await db
    .select({
      truckId: reviews.truckId,
      count: sql<number>`count(*)::int`,
      avg: sql<number>`avg(rating)::float`,
    })
    .from(reviews)
    .where(isNull(reviews.hiddenAt))
    .groupBy(reviews.truckId);
  const reviewMap = new Map(reviewStats.map((r) => [r.truckId, r]));

  return rows.map((row) => {
    const stat = reviewMap.get(row.id);
    return {
      id: row.id,
      ownerId: row.id,
      name: row.name,
      description: row.description,
      cuisine: row.cuisine as CuisineType,
      photoUrl: row.photoUrl,
      isOpen: row.isOpen,
      lat: row.lat,
      lng: row.lng,
      locationUpdatedAt: row.locationUpdatedAt?.toISOString() ?? null,
      waitMinutes: row.waitMinutes,
      viewCount: row.viewCount,
      favoriteCount: favoriteMap.get(row.id) ?? 0,
      averageRating: stat ? Number(stat.avg.toFixed(2)) : null,
      reviewCount: stat?.count ?? 0,
      createdAt: row.createdAt.toISOString(),
      verified: row.verified,
      website: row.website,
      phone: row.phone,
    };
  });
}

export type TruckListFilter = {
  cuisine?: CuisineType;
  search?: string;
  near?: { lat: number; lng: number; radiusMiles: number };
  openOnly?: boolean;
  dietaryTags?: DietaryTag[];
  sort?: TruckSortType;
  limit?: number;
};

async function trucksWithDietaryTags(tags: DietaryTag[]): Promise<Set<string>> {
  const rows = await db
    .select({ truckId: menuItems.truckId, dietaryTags: menuItems.dietaryTags })
    .from(menuItems);
  const matching = new Set<string>();
  for (const row of rows) {
    const itemTags = parseDietaryTags(row.dietaryTags);
    if (tags.some((t) => itemTags.includes(t))) matching.add(row.truckId);
  }
  return matching;
}

export async function listTrucks(filter: TruckListFilter = {}): Promise<Truck[]> {
  let trucks = await hydrate(await baseQuery());

  if (filter.cuisine) {
    trucks = trucks.filter((t) => t.cuisine === filter.cuisine);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    trucks = trucks.filter((t) => t.name.toLowerCase().includes(q));
  }
  if (filter.openOnly) {
    trucks = trucks.filter((t) => t.isOpen);
  }
  if (filter.dietaryTags && filter.dietaryTags.length > 0) {
    const matching = await trucksWithDietaryTags(filter.dietaryTags);
    trucks = trucks.filter((t) => matching.has(t.id));
  }
  if (filter.near) {
    const { lat, lng } = filter.near;
    trucks = trucks.map((t) =>
      t.lat != null && t.lng != null
        ? { ...t, distanceMiles: distanceMiles({ lat, lng }, { lat: t.lat, lng: t.lng }) }
        : t,
    );
    trucks = trucks.filter(
      (t) => t.distanceMiles != null && t.distanceMiles <= filter.near!.radiusMiles,
    );
  }

  switch (filter.sort) {
    case "rating":
      trucks = [...trucks].sort(
        (a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1),
      );
      break;
    case "distance":
      trucks = [...trucks].sort(
        (a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity),
      );
      break;
    case "newest":
      trucks = [...trucks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "trending":
      trucks = [...trucks].sort(
        (a, b) => b.viewCount - a.viewCount || b.favoriteCount - a.favoriteCount,
      );
      break;
  }

  if (filter.limit != null) {
    trucks = trucks.slice(0, filter.limit);
  }

  return trucks;
}

export async function getTruck(truckId: string): Promise<Truck | null> {
  const rows = await baseQuery().where(eq(users.id, truckId));
  return (await hydrate(rows))[0] ?? null;
}

export async function getTrucksByIds(truckIds: string[]): Promise<Truck[]> {
  if (truckIds.length === 0) return [];
  const trucks = await hydrate(await baseQuery());
  return trucks.filter((t) => truckIds.includes(t.id));
}

export async function getTruckDetail(truckId: string): Promise<TruckDetail | null> {
  const truck = await getTruck(truckId);
  if (!truck) return null;

  const photoRows = await db
    .select()
    .from(truckPhotos)
    .where(eq(truckPhotos.truckId, truckId))
    .orderBy(desc(truckPhotos.createdAt));
  const photos = photoRows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  const menuRows = await db.select().from(menuItems).where(eq(menuItems.truckId, truckId));
  const menu = menuRows.map((item) => ({
    ...item,
    dietaryTags: parseDietaryTags(item.dietaryTags),
    createdAt: item.createdAt.toISOString(),
  }));

  const scheduleRows = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.truckId, truckId))
    .orderBy(scheduleEntries.dayOfWeek, scheduleEntries.startTime);
  const schedule = scheduleRows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  const postRows = await db
    .select()
    .from(truckPosts)
    .where(eq(truckPosts.truckId, truckId))
    .orderBy(desc(truckPosts.createdAt));
  const posts = postRows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  return { ...truck, photos, menu, schedule, posts };
}

export async function incrementTruckView(truckId: string): Promise<void> {
  await db
    .update(truckProfiles)
    .set({ viewCount: sql`${truckProfiles.viewCount} + 1` })
    .where(eq(truckProfiles.userId, truckId));
}
