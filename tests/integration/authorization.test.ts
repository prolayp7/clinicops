import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  patient: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  document: { findMany: vi.fn(), count: vi.fn() },
  prescription: { findFirst: vi.fn() },
  labOrder: { findFirst: vi.fn() },
  invoice: { findFirst: vi.fn() },
  payment: { findFirst: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => ({ getDocumentSignedUrl: vi.fn(), ALLOWED_DOCUMENT_TYPES: new Set(), MAX_DOCUMENT_BYTES: 10, uploadDocument: vi.fn() }));
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/services/appointments-service", () => ({ requestAppointment: vi.fn() }));
import { getPatientById, listPatients, updatePatientClinical } from "@/server/services/patients-service";
import { listDocuments } from "@/server/services/documents-service";
import { getPortalPrescriptionById, getPortalLabOrderById, getPortalInvoiceById, getPortalPaymentById } from "@/server/services/portal-service";

const actor = (role: Role) => ({ profile: { id: "doctor-session", role } }) as CurrentUser;
beforeEach(() => {
  vi.clearAllMocks();
  db.patient.findMany.mockResolvedValue([]);
  db.patient.count.mockResolvedValue(0);
  db.patient.findFirst.mockResolvedValue(null);
  db.document.findMany.mockResolvedValue([]);
  db.document.count.mockResolvedValue(0);
});

describe("service authorization boundaries (mocked database)", () => {
  it.each([Role.LAB_TECHNICIAN, Role.ACCOUNTANT, Role.PATIENT])("denies patient listing for %s before DB access", async (role) => {
    await expect(listPatients(actor(role), { page: 1, pageSize: 20 })).rejects.toThrow();
    expect(db.patient.findMany).not.toHaveBeenCalled();
  });
  it("scopes doctor patient searches and details to assigned patients", async () => {
    await listPatients(actor(Role.DOCTOR), { page: 1, pageSize: 20 });
    await expect(getPatientById(actor(Role.DOCTOR), "unrelated")).resolves.toBeNull();
    for (const mock of [db.patient.findMany, db.patient.findFirst]) {
      expect(mock.mock.calls[0]![0].where.appointments.some.doctor.staffProfileId).toBe("doctor-session");
    }
  });
  it("denies clinical edits for an unrelated patient", async () => {
    await expect(updatePatientClinical(actor(Role.DOCTOR), "unrelated", { allergies: [], previousDiagnoses: [], currentMedications: [], medicalHistory: "" })).rejects.toThrow("Patient not found");
    expect(db.patient.update).not.toHaveBeenCalled();
  });
  it("scopes documents before signing any download", async () => {
    await listDocuments(actor(Role.DOCTOR), {});
    expect(db.document.findMany.mock.calls[0]![0].where.patient.appointments.some.doctor.staffProfileId).toBe("doctor-session");
  });
  it("enforces portal ownership and release in database predicates", async () => {
    await getPortalPrescriptionById("own", "other");
    await getPortalLabOrderById("own", "other");
    await getPortalInvoiceById("own", "other");
    await getPortalPaymentById("own", "other");
    expect(db.prescription.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", patientId: "own", status: "ISSUED" } }));
    expect(db.labOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", patientId: "own", status: "REVIEWED" } }));
    expect(db.invoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", patientId: "own" } }));
    expect(db.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", invoice: { patientId: "own" } } }));
  });
});
