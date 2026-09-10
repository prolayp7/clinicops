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

describe("Phase 1 clinic/doctor policies", () => {
  it("restricts settings and lookup-table management to admins", () => {
    for (const action of ["settings:manage", "departments:manage", "specializations:manage"] as const) {
      expect(can(Role.SUPER_ADMIN, action)).toBe(true);
      expect(can(Role.ADMIN, action)).toBe(true);
      expect(can(Role.DOCTOR, action)).toBe(false);
      expect(can(Role.RECEPTIONIST, action)).toBe(false);
      expect(can(Role.PATIENT, action)).toBe(false);
    }
  });

  it("lets admins, doctors and receptionists view the doctor directory", () => {
    expect(can(Role.SUPER_ADMIN, "doctors:view")).toBe(true);
    expect(can(Role.ADMIN, "doctors:view")).toBe(true);
    expect(can(Role.DOCTOR, "doctors:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "doctors:view")).toBe(true);
    expect(can(Role.NURSE, "doctors:view")).toBe(false);
    expect(can(Role.PATIENT, "doctors:view")).toBe(false);
  });

  it("restricts core doctor profile management to admins only", () => {
    expect(can(Role.SUPER_ADMIN, "doctors:manage")).toBe(true);
    expect(can(Role.ADMIN, "doctors:manage")).toBe(true);
    expect(can(Role.DOCTOR, "doctors:manage")).toBe(false);
    expect(can(Role.RECEPTIONIST, "doctors:manage")).toBe(false);
  });

  it("allows doctors to manage availability at the role level (record-level ownership is a service-layer check)", () => {
    expect(can(Role.DOCTOR, "doctors:manage-availability")).toBe(true);
    expect(can(Role.ADMIN, "doctors:manage-availability")).toBe(true);
    expect(can(Role.RECEPTIONIST, "doctors:manage-availability")).toBe(false);
  });
});

describe("Phase 2 patient policies", () => {
  it("lets clinical and front-desk roles view patients, but not lab/accounting", () => {
    expect(can(Role.SUPER_ADMIN, "patients:view")).toBe(true);
    expect(can(Role.ADMIN, "patients:view")).toBe(true);
    expect(can(Role.DOCTOR, "patients:view")).toBe(true);
    expect(can(Role.NURSE, "patients:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "patients:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "patients:view")).toBe(false);
    expect(can(Role.ACCOUNTANT, "patients:view")).toBe(false);
    expect(can(Role.PATIENT, "patients:view")).toBe(false);
  });

  it("restricts registration/demographics/archive to admins and reception", () => {
    expect(can(Role.SUPER_ADMIN, "patients:manage")).toBe(true);
    expect(can(Role.ADMIN, "patients:manage")).toBe(true);
    expect(can(Role.RECEPTIONIST, "patients:manage")).toBe(true);
    expect(can(Role.DOCTOR, "patients:manage")).toBe(false);
    expect(can(Role.NURSE, "patients:manage")).toBe(false);
  });

  it("lets clinical roles (not reception) edit medical history", () => {
    expect(can(Role.DOCTOR, "patients:manage-clinical")).toBe(true);
    expect(can(Role.NURSE, "patients:manage-clinical")).toBe(true);
    expect(can(Role.SUPER_ADMIN, "patients:manage-clinical")).toBe(true);
    expect(can(Role.RECEPTIONIST, "patients:manage-clinical")).toBe(false);
  });
});

describe("Phase 3 appointment policies", () => {
  it("lets clinical and front-desk roles view appointments, but not lab/accounting", () => {
    expect(can(Role.SUPER_ADMIN, "appointments:view")).toBe(true);
    expect(can(Role.ADMIN, "appointments:view")).toBe(true);
    expect(can(Role.DOCTOR, "appointments:view")).toBe(true);
    expect(can(Role.NURSE, "appointments:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "appointments:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "appointments:view")).toBe(false);
    expect(can(Role.ACCOUNTANT, "appointments:view")).toBe(false);
  });

  it("restricts booking/reschedule/cancel to admins and reception", () => {
    expect(can(Role.SUPER_ADMIN, "appointments:manage")).toBe(true);
    expect(can(Role.ADMIN, "appointments:manage")).toBe(true);
    expect(can(Role.RECEPTIONIST, "appointments:manage")).toBe(true);
    expect(can(Role.DOCTOR, "appointments:manage")).toBe(false);
    expect(can(Role.NURSE, "appointments:manage")).toBe(false);
  });

  it("lets clinical and front-desk roles advance the day-of status", () => {
    expect(can(Role.RECEPTIONIST, "appointments:manage-status")).toBe(true);
    expect(can(Role.DOCTOR, "appointments:manage-status")).toBe(true);
    expect(can(Role.NURSE, "appointments:manage-status")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "appointments:manage-status")).toBe(false);
  });

  it("restricts the availability/leave override to admins and reception", () => {
    expect(can(Role.SUPER_ADMIN, "appointments:override-availability")).toBe(true);
    expect(can(Role.RECEPTIONIST, "appointments:override-availability")).toBe(true);
    expect(can(Role.DOCTOR, "appointments:override-availability")).toBe(false);
    expect(can(Role.NURSE, "appointments:override-availability")).toBe(false);
  });
});

describe("Phase 4 consultation policies", () => {
  it("lets clinical and front-desk roles view the consultation queue, but not lab/accounting", () => {
    expect(can(Role.SUPER_ADMIN, "consultations:view")).toBe(true);
    expect(can(Role.ADMIN, "consultations:view")).toBe(true);
    expect(can(Role.DOCTOR, "consultations:view")).toBe(true);
    expect(can(Role.NURSE, "consultations:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "consultations:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "consultations:view")).toBe(false);
    expect(can(Role.ACCOUNTANT, "consultations:view")).toBe(false);
  });

  it("lets a doctor or a support role (nurse) start/record vitals, but not reception", () => {
    expect(can(Role.SUPER_ADMIN, "consultations:manage-vitals")).toBe(true);
    expect(can(Role.ADMIN, "consultations:manage-vitals")).toBe(true);
    expect(can(Role.DOCTOR, "consultations:manage-vitals")).toBe(true);
    expect(can(Role.NURSE, "consultations:manage-vitals")).toBe(true);
    expect(can(Role.RECEPTIONIST, "consultations:manage-vitals")).toBe(false);
  });

  it("restricts diagnosis/notes/plan/completion/amendment to admins and doctors", () => {
    expect(can(Role.SUPER_ADMIN, "consultations:manage-clinical")).toBe(true);
    expect(can(Role.ADMIN, "consultations:manage-clinical")).toBe(true);
    expect(can(Role.DOCTOR, "consultations:manage-clinical")).toBe(true);
    expect(can(Role.NURSE, "consultations:manage-clinical")).toBe(false);
    expect(can(Role.RECEPTIONIST, "consultations:manage-clinical")).toBe(false);
  });
});

describe("Phase 5 prescription policies", () => {
  it("lets clinical roles view/manage the medicine master, but reception cannot even view it", () => {
    expect(can(Role.SUPER_ADMIN, "medicines:view")).toBe(true);
    expect(can(Role.ADMIN, "medicines:view")).toBe(true);
    expect(can(Role.DOCTOR, "medicines:view")).toBe(true);
    expect(can(Role.NURSE, "medicines:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "medicines:view")).toBe(false);
  });

  it("restricts medicine master management to admins only", () => {
    expect(can(Role.SUPER_ADMIN, "medicines:manage")).toBe(true);
    expect(can(Role.ADMIN, "medicines:manage")).toBe(true);
    expect(can(Role.DOCTOR, "medicines:manage")).toBe(false);
    expect(can(Role.NURSE, "medicines:manage")).toBe(false);
  });

  it("lets clinical and front-desk roles view prescription history, but not lab/accounting", () => {
    expect(can(Role.SUPER_ADMIN, "prescriptions:view")).toBe(true);
    expect(can(Role.ADMIN, "prescriptions:view")).toBe(true);
    expect(can(Role.DOCTOR, "prescriptions:view")).toBe(true);
    expect(can(Role.NURSE, "prescriptions:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "prescriptions:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "prescriptions:view")).toBe(false);
    expect(can(Role.ACCOUNTANT, "prescriptions:view")).toBe(false);
  });

  it("restricts writing/issuing a prescription to admins and doctors — never nurses or reception", () => {
    expect(can(Role.SUPER_ADMIN, "prescriptions:manage")).toBe(true);
    expect(can(Role.ADMIN, "prescriptions:manage")).toBe(true);
    expect(can(Role.DOCTOR, "prescriptions:manage")).toBe(true);
    expect(can(Role.NURSE, "prescriptions:manage")).toBe(false);
    expect(can(Role.RECEPTIONIST, "prescriptions:manage")).toBe(false);
  });

  it("lets a doctor manage their own signature at the role level (ownership is a service-layer check)", () => {
    expect(can(Role.DOCTOR, "doctors:manage-signature")).toBe(true);
    expect(can(Role.ADMIN, "doctors:manage-signature")).toBe(true);
    expect(can(Role.RECEPTIONIST, "doctors:manage-signature")).toBe(false);
  });
});

describe("Phase 6 laboratory policies", () => {
  it("lets clinical, lab and front-desk roles view orders, but not accounting", () => {
    expect(can(Role.SUPER_ADMIN, "laboratory:view")).toBe(true);
    expect(can(Role.ADMIN, "laboratory:view")).toBe(true);
    expect(can(Role.DOCTOR, "laboratory:view")).toBe(true);
    expect(can(Role.NURSE, "laboratory:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "laboratory:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "laboratory:view")).toBe(true);
    expect(can(Role.ACCOUNTANT, "laboratory:view")).toBe(false);
  });

  it("restricts the lab-test catalog to admins only", () => {
    expect(can(Role.SUPER_ADMIN, "laboratory:manage-catalog")).toBe(true);
    expect(can(Role.ADMIN, "laboratory:manage-catalog")).toBe(true);
    expect(can(Role.DOCTOR, "laboratory:manage-catalog")).toBe(false);
    expect(can(Role.LAB_TECHNICIAN, "laboratory:manage-catalog")).toBe(false);
  });

  it("restricts placing/cancelling an order to admins and doctors — not lab techs or reception", () => {
    expect(can(Role.SUPER_ADMIN, "laboratory:manage-orders")).toBe(true);
    expect(can(Role.ADMIN, "laboratory:manage-orders")).toBe(true);
    expect(can(Role.DOCTOR, "laboratory:manage-orders")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "laboratory:manage-orders")).toBe(false);
    expect(can(Role.RECEPTIONIST, "laboratory:manage-orders")).toBe(false);
  });

  it("restricts sample handling and result entry to lab technicians and admins — not doctors", () => {
    expect(can(Role.SUPER_ADMIN, "laboratory:manage-samples")).toBe(true);
    expect(can(Role.ADMIN, "laboratory:manage-samples")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "laboratory:manage-samples")).toBe(true);
    expect(can(Role.DOCTOR, "laboratory:manage-samples")).toBe(false);
    expect(can(Role.NURSE, "laboratory:manage-samples")).toBe(false);
  });

  it("restricts review/release to admins and doctors — not lab technicians", () => {
    expect(can(Role.SUPER_ADMIN, "laboratory:review")).toBe(true);
    expect(can(Role.ADMIN, "laboratory:review")).toBe(true);
    expect(can(Role.DOCTOR, "laboratory:review")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "laboratory:review")).toBe(false);
  });
});

describe("Phase 7 billing policies", () => {
  it("lets front-desk, accounting and admin roles view billing, but never lab technicians", () => {
    expect(can(Role.SUPER_ADMIN, "billing:view")).toBe(true);
    expect(can(Role.ADMIN, "billing:view")).toBe(true);
    expect(can(Role.ACCOUNTANT, "billing:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "billing:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "billing:view")).toBe(false);
    expect(can(Role.DOCTOR, "billing:view")).toBe(false);
    expect(can(Role.NURSE, "billing:view")).toBe(false);
  });

  it("lets reception create/edit invoices (basic billing), matching the front-desk role description", () => {
    expect(can(Role.SUPER_ADMIN, "billing:manage-invoices")).toBe(true);
    expect(can(Role.ADMIN, "billing:manage-invoices")).toBe(true);
    expect(can(Role.ACCOUNTANT, "billing:manage-invoices")).toBe(true);
    expect(can(Role.RECEPTIONIST, "billing:manage-invoices")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "billing:manage-invoices")).toBe(false);
  });

  it("lets reception record payments at checkout", () => {
    expect(can(Role.SUPER_ADMIN, "billing:record-payment")).toBe(true);
    expect(can(Role.ACCOUNTANT, "billing:record-payment")).toBe(true);
    expect(can(Role.RECEPTIONIST, "billing:record-payment")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "billing:record-payment")).toBe(false);
  });

  it("restricts refunds to admins and accountants — reception cannot issue one", () => {
    expect(can(Role.SUPER_ADMIN, "billing:refund")).toBe(true);
    expect(can(Role.ADMIN, "billing:refund")).toBe(true);
    expect(can(Role.ACCOUNTANT, "billing:refund")).toBe(true);
    expect(can(Role.RECEPTIONIST, "billing:refund")).toBe(false);
  });

  it("restricts revenue summaries to admins and accountants — reception cannot see them", () => {
    expect(can(Role.SUPER_ADMIN, "billing:view-revenue")).toBe(true);
    expect(can(Role.ADMIN, "billing:view-revenue")).toBe(true);
    expect(can(Role.ACCOUNTANT, "billing:view-revenue")).toBe(true);
    expect(can(Role.RECEPTIONIST, "billing:view-revenue")).toBe(false);
  });
});

describe("Phase 8 document, report and portal-administration policies", () => {
  it("lets clinical and front-desk roles view documents, but not lab/accounting", () => {
    expect(can(Role.SUPER_ADMIN, "documents:view")).toBe(true);
    expect(can(Role.ADMIN, "documents:view")).toBe(true);
    expect(can(Role.DOCTOR, "documents:view")).toBe(true);
    expect(can(Role.NURSE, "documents:view")).toBe(true);
    expect(can(Role.RECEPTIONIST, "documents:view")).toBe(true);
    expect(can(Role.LAB_TECHNICIAN, "documents:view")).toBe(false);
    expect(can(Role.ACCOUNTANT, "documents:view")).toBe(false);
  });

  it("restricts uploading/archiving documents to admins and reception", () => {
    expect(can(Role.SUPER_ADMIN, "documents:manage")).toBe(true);
    expect(can(Role.ADMIN, "documents:manage")).toBe(true);
    expect(can(Role.RECEPTIONIST, "documents:manage")).toBe(true);
    expect(can(Role.DOCTOR, "documents:manage")).toBe(false);
    expect(can(Role.NURSE, "documents:manage")).toBe(false);
  });

  it("restricts the document-category master data to admins only", () => {
    expect(can(Role.SUPER_ADMIN, "document-categories:manage")).toBe(true);
    expect(can(Role.ADMIN, "document-categories:manage")).toBe(true);
    expect(can(Role.RECEPTIONIST, "document-categories:manage")).toBe(false);
  });

  it("restricts the Reports section to admins and accounting", () => {
    expect(can(Role.SUPER_ADMIN, "reports:view")).toBe(true);
    expect(can(Role.ADMIN, "reports:view")).toBe(true);
    expect(can(Role.ACCOUNTANT, "reports:view")).toBe(true);
    expect(can(Role.DOCTOR, "reports:view")).toBe(false);
    expect(can(Role.RECEPTIONIST, "reports:view")).toBe(false);
  });

  it("lets admins and reception administer patient portal access", () => {
    expect(can(Role.SUPER_ADMIN, "patients:manage-portal-access")).toBe(true);
    expect(can(Role.ADMIN, "patients:manage-portal-access")).toBe(true);
    expect(can(Role.RECEPTIONIST, "patients:manage-portal-access")).toBe(true);
    expect(can(Role.DOCTOR, "patients:manage-portal-access")).toBe(false);
    expect(can(Role.NURSE, "patients:manage-portal-access")).toBe(false);
  });
});
