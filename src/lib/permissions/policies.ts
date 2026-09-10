import { Role } from "@prisma/client";

export type Action =
  | "dashboard:view"
  | "settings:manage"
  | "departments:manage"
  | "specializations:manage"
  | "doctors:view"
  | "doctors:manage"
  | "doctors:manage-availability"
  | "patients:view"
  | "patients:manage"
  | "patients:manage-clinical"
  | "appointments:view"
  | "appointments:manage"
  | "appointments:manage-status"
  | "appointments:override-availability"
  | "consultations:view"
  | "consultations:manage-vitals"
  | "consultations:manage-clinical"
  | "medicines:view"
  | "medicines:manage"
  | "prescriptions:view"
  | "prescriptions:manage"
  | "doctors:manage-signature"
  | "laboratory:view"
  | "laboratory:manage-catalog"
  | "laboratory:manage-orders"
  | "laboratory:manage-samples"
  | "laboratory:review"
  | "billing:view"
  | "billing:manage-invoices"
  | "billing:record-payment"
  | "billing:refund"
  | "billing:view-revenue"
  | "documents:view"
  | "documents:manage"
  | "document-categories:manage"
  | "reports:view"
  | "patients:manage-portal-access"
  | "users:view"
  | "users:manage"
  | "audit-logs:view";

const { SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE, LAB_TECHNICIAN, ACCOUNTANT } = Role;

/** Server-side permission table. Every later domain module adds its own actions here rather
 * than inferring access from the UI. Record-level checks (e.g. a doctor editing only their own
 * availability) happen in the service layer, on top of this role gate. */
const POLICY: Record<Action, ReadonlySet<Role>> = {
  "dashboard:view": new Set(Object.values(Role).filter((role) => role !== Role.PATIENT)),
  "settings:manage": new Set([SUPER_ADMIN, ADMIN]),
  "departments:manage": new Set([SUPER_ADMIN, ADMIN]),
  "specializations:manage": new Set([SUPER_ADMIN, ADMIN]),
  "doctors:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST]),
  "doctors:manage": new Set([SUPER_ADMIN, ADMIN]),
  "doctors:manage-availability": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "patients:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE]),
  "patients:manage": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST]),
  "patients:manage-clinical": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE]),
  "appointments:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, RECEPTIONIST, NURSE]),
  "appointments:manage": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST]),
  "appointments:manage-status": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST, DOCTOR, NURSE]),
  "appointments:override-availability": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST]),
  "consultations:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST]),
  "consultations:manage-vitals": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE]),
  "consultations:manage-clinical": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "medicines:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE]),
  "medicines:manage": new Set([SUPER_ADMIN, ADMIN]),
  "prescriptions:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST]),
  "prescriptions:manage": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "doctors:manage-signature": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "laboratory:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE, LAB_TECHNICIAN, RECEPTIONIST]),
  "laboratory:manage-catalog": new Set([SUPER_ADMIN, ADMIN]),
  "laboratory:manage-orders": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "laboratory:manage-samples": new Set([SUPER_ADMIN, ADMIN, LAB_TECHNICIAN]),
  "laboratory:review": new Set([SUPER_ADMIN, ADMIN, DOCTOR]),
  "billing:view": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT, RECEPTIONIST]),
  "billing:manage-invoices": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT, RECEPTIONIST]),
  "billing:record-payment": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT, RECEPTIONIST]),
  "billing:refund": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT]),
  "billing:view-revenue": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT]),
  "documents:view": new Set([SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST]),
  "documents:manage": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST]),
  "document-categories:manage": new Set([SUPER_ADMIN, ADMIN]),
  "reports:view": new Set([SUPER_ADMIN, ADMIN, ACCOUNTANT]),
  "patients:manage-portal-access": new Set([SUPER_ADMIN, ADMIN, RECEPTIONIST]),
  "users:view": new Set([SUPER_ADMIN, ADMIN]),
  "users:manage": new Set([SUPER_ADMIN]),
  "audit-logs:view": new Set([SUPER_ADMIN, ADMIN]),
};

export function can(role: Role, action: Action): boolean {
  return POLICY[action].has(role);
}

export class ForbiddenError extends Error {
  constructor(action: Action) {
    super(`Role is not permitted to perform "${action}"`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new ForbiddenError(action);
  }
}
