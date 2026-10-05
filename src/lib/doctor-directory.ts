import type { Weekday } from "@prisma/client";
import { isDuringLeave, type LeaveRange } from "@/lib/appointments";

/** Pure helpers computing a doctor's "today" status for the directory — kept dependency-free
 * so they're trivially unit-testable without a database. */

export type AvailabilityBlock = { weekday: Weekday; startTime: string; endTime: string };

export type ClinicalStatus = "ON_LEAVE" | "IN_CONSULTATION" | "AVAILABLE" | "OFF_DUTY";

export type DoctorDayStatus = {
  /** e.g. "08:00–16:30", "08:00–12:00, 13:00–17:00", "Off shift today" or "On leave". */
  shiftLabel: string;
  clinicalStatus: ClinicalStatus;
  slotsBooked: number;
  slotsCapacity: number;
};

function minutesBetween(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour! * 60 + endMinute!) - (startHour! * 60 + startMinute!);
}

export function computeDoctorDayStatus(params: {
  weekday: Weekday;
  today: string; // ISO "YYYY-MM-DD"
  availability: AvailabilityBlock[];
  leaves: LeaveRange[];
  slotDurationMinutes: number;
  bookedAppointmentsToday: number;
  hasActiveConsultation: boolean;
}): DoctorDayStatus {
  const onLeave = isDuringLeave(params.today, params.leaves);
  const todaysBlocks = params.availability.filter((b) => b.weekday === params.weekday);

  const slotsCapacity = todaysBlocks.reduce(
    (sum, b) => sum + Math.max(0, Math.floor(minutesBetween(b.startTime, b.endTime) / params.slotDurationMinutes)),
    0,
  );

  const shiftLabel = onLeave
    ? "On leave"
    : todaysBlocks.length === 0
      ? "Off shift today"
      : todaysBlocks.map((b) => `${b.startTime}–${b.endTime}`).join(", ");

  const clinicalStatus: ClinicalStatus = onLeave
    ? "ON_LEAVE"
    : params.hasActiveConsultation
      ? "IN_CONSULTATION"
      : todaysBlocks.length > 0
        ? "AVAILABLE"
        : "OFF_DUTY";

  return {
    shiftLabel,
    clinicalStatus,
    slotsBooked: onLeave ? 0 : params.bookedAppointmentsToday,
    slotsCapacity,
  };
}

/** Whole-roster rollup for the directory's summary cards. */
export function summarizeDirectory(statuses: DoctorDayStatus[]) {
  const onShiftToday = statuses.filter((s) => s.clinicalStatus === "AVAILABLE" || s.clinicalStatus === "IN_CONSULTATION").length;
  const inConsultation = statuses.filter((s) => s.clinicalStatus === "IN_CONSULTATION").length;
  const onLeave = statuses.filter((s) => s.clinicalStatus === "ON_LEAVE").length;
  const slotsBooked = statuses.reduce((sum, s) => sum + s.slotsBooked, 0);
  const slotsCapacity = statuses.reduce((sum, s) => sum + s.slotsCapacity, 0);
  const utilizationPercent = slotsCapacity > 0 ? Math.round((slotsBooked / slotsCapacity) * 100) : 0;

  return { totalDoctors: statuses.length, onShiftToday, inConsultation, onLeave, slotsBooked, slotsCapacity, utilizationPercent };
}
