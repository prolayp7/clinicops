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

export function dateToIsoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function clinicDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const requested = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let candidate = requested;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const displayedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
    const correction = requested - displayedAsUtc;
    if (correction === 0) return new Date(candidate);
    candidate += correction;
  }

  throw new Error("This appointment time does not exist in the clinic timezone.");
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
