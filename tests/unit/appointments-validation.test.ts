import { describe, expect, it } from "vitest";
import {
  bookAppointmentSchema,
  changeStatusSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validation/appointments";

describe("bookAppointmentSchema", () => {
  const valid = {
    patientId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    doctorId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3b",
    date: "2026-09-14",
    startTime: "09:00",
    reason: "Annual checkup",
    source: "STAFF_BOOKED" as const,
  };

  it("accepts a fully valid booking", () => {
    expect(bookAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-uuid patient id", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid, patientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects an empty reason", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
  });

  it("rejects a malformed time", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid, startTime: "9am" }).success).toBe(false);
  });

  it("rejects an unknown source", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid, source: "CARRIER_PIGEON" }).success).toBe(false);
  });
});

describe("rescheduleAppointmentSchema", () => {
  it("requires a reason", () => {
    const result = rescheduleAppointmentSchema.safeParse({
      date: "2026-09-15",
      startTime: "10:00",
      reason: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid reschedule", () => {
    const result = rescheduleAppointmentSchema.safeParse({
      date: "2026-09-15",
      startTime: "10:00",
      reason: "Patient requested a later time",
    });
    expect(result.success).toBe(true);
  });
});

describe("changeStatusSchema", () => {
  it("accepts a valid forward transition without a reason", () => {
    const result = changeStatusSchema.safeParse({
      fromStatus: "SCHEDULED",
      toStatus: "CHECKED_IN",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid transition even with a reason", () => {
    const result = changeStatusSchema.safeParse({
      fromStatus: "SCHEDULED",
      toStatus: "IN_CONSULTATION",
    });
    expect(result.success).toBe(false);
  });

  it("rejects cancellation without a reason", () => {
    const result = changeStatusSchema.safeParse({
      fromStatus: "SCHEDULED",
      toStatus: "CANCELLED",
    });
    expect(result.success).toBe(false);
  });

  it("accepts cancellation with a reason", () => {
    const result = changeStatusSchema.safeParse({
      fromStatus: "SCHEDULED",
      toStatus: "CANCELLED",
      reason: "Patient called to cancel",
    });
    expect(result.success).toBe(true);
  });
});
