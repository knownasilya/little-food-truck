export type ZonedNow = { dateString: string; dayOfWeek: number; minutes: number };

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * "Now," as someone's own clock would show it in a given IANA timezone —
 * used anywhere a day-of-week/time-of-day value entered by a user (a
 * truck's schedule in lib/schedule-location.ts, a customer's watch-location
 * active window in lib/notify.ts) needs to be resolved against the
 * *current* day/time in *that person's own* zone, not the server's. Uses
 * Intl instead of a date library since that's all this one conversion
 * needs.
 */
export function zonedNow(timezone: string, at: Date): ZonedNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  // Some ICU implementations report midnight as hour "24" under hour12:false.
  const hour = Number(parts.hour) % 24;
  return {
    dateString: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: DAY_ABBR.indexOf(parts.weekday),
    minutes: hour * 60 + Number(parts.minute),
  };
}

/** "HH:MM" -> minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** True if `nowMinutes` (already resolved via zonedNow, in the relevant person's own zone) falls within [startTime, endTime]. */
export function isWithinTimeWindow(startTime: string, endTime: string, nowMinutes: number): boolean {
  return nowMinutes >= toMinutes(startTime) && nowMinutes <= toMinutes(endTime);
}
