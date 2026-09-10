/** Pure helpers for doctor availability/leave conflict checks — kept dependency-free so they're
 * trivially unit-testable without a database. */

/** Prisma's `@db.Time` columns round-trip as JS Dates anchored to the Unix epoch date. */
export function timeStringToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

export function dateToTimeString(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export type TimeRange = { startTime: string; endTime: string };

/** Half-open interval overlap: [a.start, a.end) intersects [b.start, b.end). */
export function timeRangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export type DateRange = { startDate: string; endDate: string };

/** Inclusive date range overlap, comparing ISO ("YYYY-MM-DD") strings lexicographically. */
export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
