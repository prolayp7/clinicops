import type { AppointmentSource, AppointmentStatus, Weekday } from "@prisma/client";

/** The appointment status state machine. Two entry points (REQUESTED for online requests,
 * SCHEDULED for everything else), converging through the day-of-visit flow to a terminal state.
 * Any non-terminal status can be cancelled; SCHEDULED/CONFIRMED can lapse to NO_SHOW. */
export const VALID_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["WAITING", "CANCELLED"],
  WAITING: ["IN_CONSULTATION", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function isValidTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export const TERMINAL_STATUSES: readonly AppointmentStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

export function isTerminalStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** CANCELLED/NO_SHOW free up the slot; every other status still occupies it for conflict checks. */
export const SLOT_BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  "REQUESTED",
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
];

const REASON_REQUIRED_STATUSES: readonly AppointmentStatus[] = ["CANCELLED", "NO_SHOW"];

export function isReasonRequired(to: AppointmentStatus): boolean {
  return REASON_REQUIRED_STATUSES.includes(to);
}

/** A directly staff-booked or walk-in visit is committed immediately; only an online request
 * starts in the REQUESTED (awaiting-confirmation) state. */
export function initialStatusForSource(source: AppointmentSource): AppointmentStatus {
  return source === "ONLINE_REQUEST" ? "REQUESTED" : "SCHEDULED";
}

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** `date` is an ISO "YYYY-MM-DD" string, interpreted as a UTC calendar date. */
export function weekdayFromDateString(date: string): Weekday {
  const parts = date.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return WEEKDAY_BY_JS_DAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]!;
}

export function addMinutesToTimeString(hhmm: string, minutes: number): string {
  const parts = hhmm.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const mins = parts[1] ?? 0;
  const total = hours * 60 + mins + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

export type AvailabilityBlock = { weekday: Weekday; startTime: string; endTime: string };

/** True when [startTime, endTime) sits entirely inside at least one of the doctor's weekly
 * availability blocks for that weekday. */
export function isWithinAvailability(
  weekday: Weekday,
  startTime: string,
  endTime: string,
  blocks: AvailabilityBlock[],
): boolean {
  return blocks.some(
    (b) => b.weekday === weekday && startTime >= b.startTime && endTime <= b.endTime,
  );
}

export type LeaveRange = { startDate: string; endDate: string };

/** `date` is an ISO "YYYY-MM-DD" string. */
export function isDuringLeave(date: string, leaves: LeaveRange[]): boolean {
  return leaves.some((l) => date >= l.startDate && date <= l.endDate);
}
