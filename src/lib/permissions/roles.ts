import { Role } from "@prisma/client";

export { Role };

export const ALL_ROLES = Object.values(Role);

/** Top-level navigation items and which roles may see/use them. Phase 0 exposes only
 * the Dashboard; each later phase adds its module here alongside its own implementation. */
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", roles: ALL_ROLES.filter((r) => r !== Role.PATIENT) },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function getNavItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => (item.roles as readonly Role[]).includes(role));
}

export function isStaffRole(role: Role): boolean {
  return role !== Role.PATIENT;
}
