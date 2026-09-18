import { distanceMiles } from "@little-food-truck/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { customerProfiles, favorites, notifications, watchLocations } from "../db/schema.js";
import { newId } from "./id.js";
import { sendPushToUser } from "./push.js";
import { isWithinTimeWindow, zonedNow } from "./time.js";
import { parseActiveDays } from "./watch-locations.js";

const NOTIFY_COOLDOWN_HOURS = 2;

/**
 * True if "now" — resolved in the customer's own timezone, since a watch
 * location's activeDays/startTime/endTime are entered from that customer's
 * own perspective (see customer_profiles.timezone, set from /account) —
 * falls inside a watch location's active window. Empty/unset = always
 * active.
 */
function isWithinActiveWindow(
  location: { activeDays: string; startTime: string | null; endTime: string | null },
  now: { dayOfWeek: number; minutes: number },
): boolean {
  const days = parseActiveDays(location.activeDays);
  if (days.length > 0 && !days.includes(now.dayOfWeek)) return false;
  if (location.startTime && location.endTime) {
    if (!isWithinTimeWindow(location.startTime, location.endTime, now.minutes)) return false;
  }
  return true;
}

/**
 * Called after a truck updates its location. Notifies customers who have
 * favorited this truck and have at least one saved watch location (Home,
 * Work, ...) that's both within radius and — if it has an active
 * day/time window set — currently active in that customer's own timezone
 * (customer_profiles.timezone). Skips anyone already notified about this
 * truck recently, so a truck moving block-to-block doesn't spam. Writes the
 * in-app notification row and fires a web push in parallel; the push is
 * best-effort (silently skipped for anyone without a live subscription —
 * see sendPushToUser).
 */
export async function notifyNearbyFavorites(params: {
  truckId: string;
  truckName: string;
  truckLat: number;
  truckLng: number;
  isOpen: boolean;
}) {
  if (!params.isOpen) return;

  const favoriters = await db
    .select({
      customerId: favorites.customerId,
      timezone: customerProfiles.timezone,
      locationId: watchLocations.id,
      lat: watchLocations.lat,
      lng: watchLocations.lng,
      radiusMiles: watchLocations.radiusMiles,
      activeDays: watchLocations.activeDays,
      startTime: watchLocations.startTime,
      endTime: watchLocations.endTime,
    })
    .from(favorites)
    .innerJoin(watchLocations, eq(watchLocations.customerId, favorites.customerId))
    .innerJoin(customerProfiles, eq(customerProfiles.userId, favorites.customerId))
    .where(eq(favorites.truckId, params.truckId));

  const byCustomer = new Map<string, typeof favoriters>();
  for (const row of favoriters) {
    const list = byCustomer.get(row.customerId) ?? [];
    list.push(row);
    byCustomer.set(row.customerId, list);
  }

  const at = new Date();
  const cooldownCutoff = new Date(Date.now() - NOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000);

  for (const [customerId, locations] of byCustomer) {
    const now = zonedNow(locations[0].timezone, at);
    const distances = locations
      .filter((loc) => isWithinActiveWindow(loc, now))
      .map((loc) => ({
        distance: distanceMiles({ lat: loc.lat, lng: loc.lng }, { lat: params.truckLat, lng: params.truckLng }),
        radiusMiles: loc.radiusMiles,
      }))
      .filter((d) => d.distance <= d.radiusMiles)
      .map((d) => d.distance);
    if (distances.length === 0) continue;
    const distance = Math.min(...distances);

    const [recent] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.customerId, customerId),
          eq(notifications.truckId, params.truckId),
          gte(notifications.createdAt, cooldownCutoff),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);
    if (recent) continue;

    const message = `${params.truckName} is now ${distance < 1 ? "nearby" : `${distance.toFixed(1)} mi away`} and open!`;

    await db.insert(notifications).values({
      id: newId(),
      customerId,
      truckId: params.truckId,
      message,
    });

    await sendPushToUser(customerId, {
      title: params.truckName,
      body: message,
      url: `/trucks/${params.truckId}`,
    });
  }
}
