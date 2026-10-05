import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  auditLogFiltersSchema,
  createStaffSchema,
  staffListFiltersSchema,
  updateStaffProfileSchema,
  updateStaffRoleSchema,
} from "@/lib/validation/users";

describe("createStaffSchema", () => {
  it("accepts a valid staff role", () => {
    const result = createStaffSchema.safeParse({ fullName: "Jamie Rivera", email: "jamie@example.test", role: Role.NURSE });
    expect(result.success).toBe(true);
  });

  it("rejects the PATIENT role", () => {
    const result = createStaffSchema.safeParse({ fullName: "Jamie Rivera", email: "jamie@example.test", role: Role.PATIENT });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createStaffSchema.safeParse({ fullName: "Jamie Rivera", email: "not-an-email", role: Role.NURSE });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short name", () => {
    const result = createStaffSchema.safeParse({ fullName: "J", email: "jamie@example.test", role: Role.NURSE });
    expect(result.success).toBe(false);
  });
});

describe("updateStaffRoleSchema", () => {
  it("accepts any staff role", () => {
    expect(updateStaffRoleSchema.safeParse({ role: Role.ACCOUNTANT }).success).toBe(true);
  });

  it("rejects the PATIENT role", () => {
    expect(updateStaffRoleSchema.safeParse({ role: Role.PATIENT }).success).toBe(false);
  });
});

describe("updateStaffProfileSchema", () => {
  it("trims the name and normalizes the login email", () => {
    expect(updateStaffProfileSchema.parse({ fullName: " Jamie Rivera ", email: "JAMIE@example.test " })).toEqual({
      fullName: "Jamie Rivera",
      email: "jamie@example.test",
    });
  });
});

describe("user and activity query filters", () => {
  it("bounds list pagination and validates staff filters", () => {
    expect(staffListFiltersSchema.parse({ search: "  Jamie  ", role: Role.DOCTOR, status: "ACTIVE", page: "3" })).toEqual({
      search: "Jamie",
      role: Role.DOCTOR,
      status: "ACTIVE",
      page: 3,
    });
    expect(staffListFiltersSchema.safeParse({ role: "INVALID", status: "ACTIVE" }).success).toBe(false);
    expect(staffListFiltersSchema.parse({ page: "not-a-number" }).page).toBe(1);
  });

  it("accepts patient audit actors and rejects invalid or reversed dates", () => {
    expect(auditLogFiltersSchema.safeParse({ actorRole: Role.PATIENT, from: "2026-10-01", to: "2026-10-05" }).success).toBe(true);
    expect(auditLogFiltersSchema.safeParse({ from: "2026-02-30" }).success).toBe(false);
    expect(auditLogFiltersSchema.safeParse({ from: "2026-10-05", to: "2026-10-01" }).success).toBe(false);
  });
});
