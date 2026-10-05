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

describe("Super Admin staff navigation", () => {
  it("replaces the generic Users link with role-specific staff lists except Super Admin", () => {
    const navItems = getNavItemsForRole(Role.SUPER_ADMIN);
    const staffLinks = navItems.filter((item) => item.href.startsWith("/users?role="));

    expect(navItems.map((item) => item.key)).not.toContain("users");
    expect(navItems.map((item) => item.key)).toContain("doctors");
    expect(staffLinks.map((item) => item.href)).toEqual([
      "/users?role=ADMIN",
      "/users?role=RECEPTIONIST",
      "/users?role=NURSE",
      "/users?role=LAB_TECHNICIAN",
      "/users?role=ACCOUNTANT",
    ]);
  });

  it("shows Receptionists the limited role-specific staff lists", () => {
    const navItems = getNavItemsForRole(Role.RECEPTIONIST);
    const staffLinks = navItems.filter((item) => item.href.startsWith("/users?role="));

    expect(staffLinks.map((item) => item.href)).toEqual([
      "/users?role=ADMIN",
      "/users?role=RECEPTIONIST",
      "/users?role=NURSE",
      "/users?role=LAB_TECHNICIAN",
      "/users?role=ACCOUNTANT",
    ]);
    expect(navItems.map((item) => item.key)).not.toContain("users");
  });

  it("keeps the generic Users link for Admin", () => {
    const navItems = getNavItemsForRole(Role.ADMIN);
    expect(navItems.map((item) => item.key)).toContain("users");
    expect(navItems.some((item) => item.key.startsWith("user-"))).toBe(false);
  });
});

describe("roleLabel", () => {
  it("formats an underscored role as a human-readable title", () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe("Super Admin");
    expect(roleLabel(Role.LAB_TECHNICIAN)).toBe("Lab Technician");
    expect(roleLabel(Role.NURSE)).toBe("Nurse");
  });
});
