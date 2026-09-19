import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { getNavItemsForRole, isStaffRole, roleLabel, STAFF_ROLES } from "@/lib/permissions/roles";

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

describe("STAFF_ROLES", () => {
  it("excludes PATIENT and includes every other role", () => {
    expect(STAFF_ROLES).not.toContain(Role.PATIENT);
    expect(STAFF_ROLES).toContain(Role.SUPER_ADMIN);
    expect(STAFF_ROLES).toHaveLength(Object.values(Role).length - 1);
  });
});

describe("roleLabel", () => {
  it("formats an underscored role as a human-readable title", () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe("Super Admin");
    expect(roleLabel(Role.LAB_TECHNICIAN)).toBe("Lab Technician");
    expect(roleLabel(Role.NURSE)).toBe("Nurse");
  });
});
