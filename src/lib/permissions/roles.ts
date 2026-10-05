import { Role } from "@prisma/client";

export { Role };

export const ALL_ROLES = Object.values(Role);
export const STAFF_ROLES = ALL_ROLES.filter((r) => r !== Role.PATIENT);

const { SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE, LAB_TECHNICIAN, ACCOUNTANT } = Role;

/** Top-level navigation, in PROJECT_REQUIREMENTS.md's stated order, gated by role per its
 * role/access table. Each item's screen is added in its own IMPLEMENTATION_PLAN phase;
 * until then its route renders a stub so navigation never 404s. */
export const NAV_ITEMS = [
  { key: "dashboard", section: "overview", label: "Dashboard", href: "/dashboard", icon: "layout-grid", roles: STAFF_ROLES },
  { key: "patients", section: "care", label: "Patients", href: "/patients", icon: "users", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE] },
  { key: "doctors", section: "care", label: "Doctors", href: "/doctors", icon: "stethoscope", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST] },
  { key: "appointments", section: "care", label: "Appointments", href: "/appointments", icon: "calendar-days", roles: [SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE] },
  { key: "consultations", section: "care", label: "Consultations", href: "/consultations", icon: "clipboard-list", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "prescriptions", section: "care", label: "Prescriptions", href: "/prescriptions", icon: "pill", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "laboratory", section: "care", label: "Laboratory", href: "/laboratory", icon: "flask-conical", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, LAB_TECHNICIAN, RECEPTIONIST] },
  { key: "billing", section: "operations", label: "Billing", href: "/billing", icon: "receipt", roles: [SUPER_ADMIN, ADMIN, RECEPTIONIST, ACCOUNTANT] },
  { key: "documents", section: "operations", label: "Documents", href: "/documents", icon: "folder-open", roles: [SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST] },
  { key: "reports", section: "operations", label: "Reports", href: "/reports", icon: "bar-chart-3", roles: [SUPER_ADMIN, ADMIN, ACCOUNTANT] },
  { key: "user-admins", section: "team", label: "Admins", href: "/users?role=ADMIN", icon: "user-cog", roles: [SUPER_ADMIN, RECEPTIONIST] },
  { key: "user-receptionists", section: "team", label: "Receptionists", href: "/users?role=RECEPTIONIST", icon: "users", roles: [SUPER_ADMIN, RECEPTIONIST] },
  { key: "user-nurses", section: "team", label: "Nurses", href: "/users?role=NURSE", icon: "clipboard-list", roles: [SUPER_ADMIN, RECEPTIONIST] },
  { key: "user-lab-technicians", section: "team", label: "Lab Technicians", href: "/users?role=LAB_TECHNICIAN", icon: "flask-conical", roles: [SUPER_ADMIN, RECEPTIONIST] },
  { key: "user-accountants", section: "team", label: "Accountants", href: "/users?role=ACCOUNTANT", icon: "receipt", roles: [SUPER_ADMIN, RECEPTIONIST] },
  { key: "users", section: "team", label: "Users", href: "/users", icon: "user-cog", roles: [ADMIN] },
  { key: "settings", section: "system", label: "Settings", href: "/settings", icon: "settings", roles: [SUPER_ADMIN, ADMIN] },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
export type NavSectionKey = (typeof NAV_ITEMS)[number]["section"];
export const NAV_SECTIONS: Array<{ key: NavSectionKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "care", label: "Care" },
  { key: "operations", label: "Operations" },
  { key: "team", label: "Team" },
  { key: "system", label: "System" },
];

export function getNavItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => (item.roles as readonly Role[]).includes(role));
}

export function isStaffRole(role: Role): boolean {
  return role !== Role.PATIENT;
}

/** Human-readable label for a Role value, e.g. "SUPER_ADMIN" -> "Super Admin". */
export function roleLabel(role: Role): string {
  return role
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}
