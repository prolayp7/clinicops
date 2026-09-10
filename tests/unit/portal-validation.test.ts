import { describe, expect, it } from "vitest";
import {
  enablePortalAccessSchema,
  requestAppointmentSchema,
  updatePortalProfileSchema,
} from "@/lib/validation/portal";

describe("requestAppointmentSchema", () => {
  const valid = {
    doctorId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    date: "2026-09-14",
    startTime: "09:00",
    reason: "Follow-up",
  };

  it("accepts a valid request", () => {
    expect(requestAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed time", () => {
    expect(requestAppointmentSchema.safeParse({ ...valid, startTime: "9am" }).success).toBe(false);
  });

  it("rejects an empty reason", () => {
    expect(requestAppointmentSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
  });
});

describe("updatePortalProfileSchema", () => {
  it("accepts a phone-only update", () => {
    expect(updatePortalProfileSchema.safeParse({ phone: "555-123-4567" }).success).toBe(true);
  });

  it("rejects a too-short phone number", () => {
    expect(updatePortalProfileSchema.safeParse({ phone: "123" }).success).toBe(false);
  });

  it("does not include clinical or identity fields — a patient cannot self-edit them", () => {
    const shape = updatePortalProfileSchema.shape as Record<string, unknown>;
    for (const forbidden of ["firstName", "lastName", "dateOfBirth", "sex", "allergies", "medicalHistory"]) {
      expect(shape[forbidden]).toBeUndefined();
    }
  });
});

describe("enablePortalAccessSchema", () => {
  it("accepts a valid email", () => {
    expect(enablePortalAccessSchema.safeParse({ email: "patient@example.test" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(enablePortalAccessSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
