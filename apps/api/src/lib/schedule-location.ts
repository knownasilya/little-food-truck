import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { scheduleEntries, truckProfiles } from "../db/schema.js";
import { isWithinTimeWindow, zonedNow } from "./time.js";

/** Picks whichever candidate's time window currently contains "now," or just the first one. */
function pickBest<T extends { startTime: string; endTime: string }>(
  candidates: T[],
  nowMinutes: number,
): T | null {
  if (candidates.length === 0) return null;
  return (
    candidates.find((c) => isWithinTimeWindow(c.startTime, c.endTime, nowMinutes)) ?? candidates[0]
  );
}

/**
 * Resolves where a truck should be considered "at" when it opens for
 * business without a live GPS fix (see the /me/location handler in
 * routes/me.ts) — used so "no location service enabled" doesn't have to
 * mean "can't open at all." Priority: a one-off event scheduled for today
 * with its own location > today's recurring weekly stop with its own
 * location > the truck's default location (set via
 * /me/truck-profile/default-location) > null (caller should error).
 */
export async function resolveTodayLocation(
  truckId: string,
): Promise<{ lat: number; lng: number } | null> {
  const [profile] = await db
    .select({
      timezone: truckProfiles.timezone,
      defaultLat: truckProfiles.defaultLat,
      defaultLng: truckProfiles.defaultLng,
    })
    .from(truckProfiles)
    .where(eq(truckProfiles.userId, truckId));

  const { dateString: todayIso, dayOfWeek: todayDow, minutes: nowMinutes } = zonedNow(
    profile?.timezone ?? "America/Chicago",
    new Date(),
  );

  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.truckId, truckId));

  const todaysEvents = entries.filter(
    (e) => e.eventDate === todayIso && e.lat != null && e.lng != null,
  );
  const bestEvent = pickBest(todaysEvents, nowMinutes);
  if (bestEvent?.lat != null && bestEvent.lng != null) {
    return { lat: bestEvent.lat, lng: bestEvent.lng };
  }

  const recurringToday = entries.filter(
    (e) => !e.eventDate && e.dayOfWeek === todayDow && e.lat != null && e.lng != null,
  );
  const bestRecurring = pickBest(recurringToday, nowMinutes);
  if (bestRecurring?.lat != null && bestRecurring.lng != null) {
    return { lat: bestRecurring.lat, lng: bestRecurring.lng };
  }

  if (profile?.defaultLat != null && profile.defaultLng != null) {
    return { lat: profile.defaultLat, lng: profile.defaultLng };
  }

  return null;
}
