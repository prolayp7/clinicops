import { describe, expect, it } from "vitest";
import { Weekday } from "@prisma/client";
import { availabilitySchema, doctorSchema, leaveSchema, nameOnlySchema } from "@/lib/validation/doctors";

describe("nameOnlySchema", () => {
  it("rejects a too-short name", () => {
    expect(nameOnlySchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("accepts a trimmed valid name", () => {
    const result = nameOnlySchema.safeParse({ name: "  Cardiology  " });
    expect(result.success).toBe(true);
  });
});

describe("doctorSchema", () => {
  const valid = {
    fullName: "Dr. Jamie Rivera",
    email: "jamie@example.test",
    phone: "555-0100",
    licenseNumber: "LIC-1234",
    departmentId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    specializationId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3b",
    qualifications: ["MD"],
    consultationFeeCents: 15000,
    slotDurationMinutes: 30,
  };

  it("accepts a fully valid doctor payload", () => {
    expect(doctorSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty qualifications list", () => {
    const result = doctorSchema.safeParse({ ...valid, qualifications: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid department id", () => {
    const result = doctorSchema.safeParse({ ...valid, departmentId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative consultation fee", () => {
    const result = doctorSchema.safeParse({ ...valid, consultationFeeCents: -1 });
    expect(result.success).toBe(false);
  });
});

describe("availabilitySchema", () => {
  it("accepts a valid morning block", () => {
    const result = availabilitySchema.safeParse({
      weekday: Weekday.MONDAY,
      startTime: "09:00",
      endTime: "12:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a block where start is not before end", () => {
    const result = availabilitySchema.safeParse({
      weekday: Weekday.MONDAY,
      startTime: "12:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed time string", () => {
    const result = availabilitySchema.safeParse({
      weekday: Weekday.MONDAY,
      startTime: "9am",
      endTime: "12:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("leaveSchema", () => {
  it("accepts a valid single-day leave", () => {
    expect(
      leaveSchema.safeParse({ startDate: "2026-03-01", endDate: "2026-03-01" }).success,
    ).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = leaveSchema.safeParse({ startDate: "2026-03-10", endDate: "2026-03-01" });
    expect(result.success).toBe(false);
  });
});
