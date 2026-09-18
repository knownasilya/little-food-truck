/** DB stores activeDays as a comma-joined string (e.g. "1,2,3,4,5"); the wire format is number[]. */
export function parseActiveDays(raw: string): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}
