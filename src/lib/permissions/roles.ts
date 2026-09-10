import { Role } from "@prisma/client";

export { Role };

export const ALL_ROLES = Object.values(Role);
const STAFF_ROLES = ALL_ROLES.filter((r) => r !== Role.PATIENT);

const { SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE, LAB_TECHNICIAN, ACCOUNTANT } = Role;

/** Top-level navigation, in PROJECT_REQUIREMENTS.md's stated order, gated by role per its
 * role/access table. Each item's screen is added in its own IMPLEMENTATION_PLAN phase;
 * until then its route renders a stub so navigation never 404s. */
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "layout-grid", roles: STAFF_ROLES },
  { key: "patients", label: "Patients", href: "/patients", icon: "users", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE] },
  { key: "doctors", label: "Doctors", href: "/doctors", icon: "stethoscope", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST] },
  { key: "appointments", label: "Appointments", href: "/appointments", icon: "calendar-days", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE] },
  { key: "consultations", label: "Consultations", href: "/consultations", icon: "clipboard-list", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "prescriptions", label: "Prescriptions", href: "/prescriptions", icon: "pill", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "laboratory", label: "Laboratory", href: "/laboratory", icon: "flask-conical", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, LAB_TECHNICIAN, RECEPTIONIST] },
  { key: "billing", label: "Billing", href: "/billing", icon: "receipt", roles: [SUPER_ADMIN, ADMIN, RECEPTIONIST, ACCOUNTANT] },
  { key: "documents", label: "Documents", href: "/documents", icon: "folder-open", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "reports", label: "Reports", href: "/reports", icon: "bar-chart-3", roles: [SUPER_ADMIN, ADMIN, ACCOUNTANT] },
  { key: "users", label: "Users", href: "/users", icon: "user-cog", roles: [SUPER_ADMIN, ADMIN] },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings", roles: [SUPER_ADMIN, ADMIN] },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];

export function getNavItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => (item.roles as readonly Role[]).includes(role));
}

export function isStaffRole(role: Role): boolean {
  return role !== Role.PATIENT;
}
