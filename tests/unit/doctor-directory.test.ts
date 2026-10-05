import { describe, expect, it } from "vitest";
import { computeDoctorDayStatus, summarizeDirectory } from "@/lib/doctor-directory";

const base = {
  weekday: "MONDAY" as const,
  today: "2026-03-02", // a Monday
  availability: [{ weekday: "MONDAY" as const, startTime: "08:00", endTime: "16:00" }],
  leaves: [],
  slotDurationMinutes: 30,
  bookedAppointmentsToday: 0,
  hasActiveConsultation: false,
};

describe("computeDoctorDayStatus", () => {
  it("is on leave when today falls inside a leave range, regardless of the weekly schedule", () => {
    const status = computeDoctorDayStatus({ ...base, leaves: [{ startDate: "2026-03-01", endDate: "2026-03-03" }], bookedAppointmentsToday: 5 });
    expect(status.clinicalStatus).toBe("ON_LEAVE");
    expect(status.shiftLabel).toBe("On leave");
    expect(status.slotsBooked).toBe(0);
  });

  it("is off duty when there is no availability block for today's weekday", () => {
    const status = computeDoctorDayStatus({ ...base, weekday: "SUNDAY" });
    expect(status.clinicalStatus).toBe("OFF_DUTY");
    expect(status.shiftLabel).toBe("Off shift today");
    expect(status.slotsCapacity).toBe(0);
  });

  it("is in consultation only when on shift and an appointment is actively in progress", () => {
    const status = computeDoctorDayStatus({ ...base, hasActiveConsultation: true });
    expect(status.clinicalStatus).toBe("IN_CONSULTATION");
  });

  it("is available when on shift with no active consultation", () => {
    const status = computeDoctorDayStatus(base);
    expect(status.clinicalStatus).toBe("AVAILABLE");
    expect(status.shiftLabel).toBe("08:00–16:00");
  });

  it("derives slot capacity from the shift length and slot duration", () => {
    const status = computeDoctorDayStatus(base); // 8 hours / 30 min = 16 slots
    expect(status.slotsCapacity).toBe(16);
  });

  it("sums capacity across multiple blocks for the same day", () => {
    const status = computeDoctorDayStatus({
      ...base,
      availability: [
        { weekday: "MONDAY", startTime: "08:00", endTime: "12:00" },
        { weekday: "MONDAY", startTime: "13:00", endTime: "17:00" },
      ],
    });
    expect(status.slotsCapacity).toBe(16);
    expect(status.shiftLabel).toBe("08:00–12:00, 13:00–17:00");
  });
});

describe("summarizeDirectory", () => {
  it("rolls up per-doctor statuses into roster-wide counts and utilization", () => {
    const summary = summarizeDirectory([
      { shiftLabel: "", clinicalStatus: "AVAILABLE", slotsBooked: 4, slotsCapacity: 16 },
      { shiftLabel: "", clinicalStatus: "IN_CONSULTATION", slotsBooked: 8, slotsCapacity: 16 },
      { shiftLabel: "", clinicalStatus: "ON_LEAVE", slotsBooked: 0, slotsCapacity: 0 },
      { shiftLabel: "", clinicalStatus: "OFF_DUTY", slotsBooked: 0, slotsCapacity: 0 },
    ]);
    expect(summary).toEqual({
      totalDoctors: 4,
      onShiftToday: 2,
      inConsultation: 1,
      onLeave: 1,
      slotsBooked: 12,
      slotsCapacity: 32,
      utilizationPercent: 38, // round(12/32 * 100)
    });
  });

  it("reports zero utilization instead of dividing by zero when nobody has capacity today", () => {
    const summary = summarizeDirectory([{ shiftLabel: "", clinicalStatus: "OFF_DUTY", slotsBooked: 0, slotsCapacity: 0 }]);
    expect(summary.utilizationPercent).toBe(0);
  });
});
