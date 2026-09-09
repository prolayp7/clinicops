import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { can, assertCan, ForbiddenError } from "@/lib/permissions/policies";

describe("dashboard:view policy", () => {
  it("allows every staff role", () => {
    for (const role of Object.values(Role)) {
      if (role === Role.PATIENT) continue;
      expect(can(role, "dashboard:view")).toBe(true);
    }
  });

  it("denies the patient role", () => {
    expect(can(Role.PATIENT, "dashboard:view")).toBe(false);
  });

  it("assertCan throws ForbiddenError for a denied role", () => {
    expect(() => assertCan(Role.PATIENT, "dashboard:view")).toThrow(ForbiddenError);
  });

  it("assertCan does not throw for an allowed role", () => {
    expect(() => assertCan(Role.DOCTOR, "dashboard:view")).not.toThrow();
  });
});
