import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { createStaffSchema, updateStaffRoleSchema } from "@/lib/validation/users";

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
