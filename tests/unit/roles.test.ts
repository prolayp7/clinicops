import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { getNavItemsForRole, isStaffRole } from "@/lib/permissions/roles";

describe("getNavItemsForRole", () => {
  it("shows the Dashboard nav item to staff roles", () => {
    expect(getNavItemsForRole(Role.RECEPTIONIST).map((i) => i.key)).toContain("dashboard");
  });

  it("hides the Dashboard nav item from patients", () => {
    expect(getNavItemsForRole(Role.PATIENT).map((i) => i.key)).not.toContain("dashboard");
  });
});

describe("isStaffRole", () => {
  it("treats every role except PATIENT as staff", () => {
    expect(isStaffRole(Role.NURSE)).toBe(true);
    expect(isStaffRole(Role.PATIENT)).toBe(false);
  });
});
