import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));

const tx = vi.hoisted(() => ({
  patient: { create: vi.fn(), update: vi.fn() },
}));
const db = vi.hoisted(() => ({
  patient: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  appointment: { findMany: vi.fn() },
  consultation: { findMany: vi.fn() },
  prescription: { findMany: vi.fn() },
  labOrder: { findMany: vi.fn() },
  document: { findMany: vi.fn() },
  invoice: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

import { createPatient, DuplicateWarningError, getPatientTimeline, listPatients } from "@/server/services/patients-service";
import { formatPatientId } from "@/lib/patients";

const actor = { profile: { id: "receptionist-1", role: Role.RECEPTIONIST } } as CurrentUser;

const registrationInput = {
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-06-15",
  sex: "FEMALE" as const,
  phone: "(555) 234-8900",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  allergies: [],
  medicalHistory: "",
  previousDiagnoses: [],
  currentMedications: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback: (t: typeof tx) => unknown) => callback(tx));
  db.patient.findFirst.mockResolvedValue({ id: "patient-1" });
  db.appointment.findMany.mockResolvedValue([]);
  db.consultation.findMany.mockResolvedValue([]);
  db.prescription.findMany.mockResolvedValue([]);
  db.labOrder.findMany.mockResolvedValue([]);
  db.document.findMany.mockResolvedValue([]);
  db.invoice.findMany.mockResolvedValue([]);
});

describe("createPatient — duplicate warning", () => {
  it("throws DuplicateWarningError with the matched candidates instead of creating a record", async () => {
    const candidate = { id: "existing", patientId: "PT-000001", firstName: "Jane", lastName: "Doe", dateOfBirth: new Date("1990-06-15"), phone: "5552348900", email: null };
    db.patient.findMany.mockResolvedValue([candidate]);

    const error = await createPatient(actor, registrationInput).catch((e) => e);

    expect(error).toBeInstanceOf(DuplicateWarningError);
    expect((error as InstanceType<typeof DuplicateWarningError>).duplicates).toEqual([candidate]);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("skips the duplicate check and creates when force is true, even with matching candidates", async () => {
    db.patient.findMany.mockResolvedValue([{ id: "existing" }]);
    tx.patient.create.mockResolvedValue({ id: "new-id", sequenceNumber: 7 });
    tx.patient.update.mockResolvedValue({ id: "new-id", patientId: formatPatientId(7) });

    await expect(createPatient(actor, registrationInput, { force: true })).resolves.toMatchObject({
      patientId: "PT-000007",
    });
    expect(db.patient.findMany).not.toHaveBeenCalled();
  });
});

describe("createPatient — immutable patient ID", () => {
  it("creates with a non-client-controlled placeholder, then assigns the sequence-derived ID", async () => {
    db.patient.findMany.mockResolvedValue([]);
    tx.patient.create.mockResolvedValue({ id: "new-id", sequenceNumber: 42 });
    tx.patient.update.mockResolvedValue({ id: "new-id", patientId: formatPatientId(42) });

    const patient = await createPatient(actor, registrationInput);

    const createArgs = tx.patient.create.mock.calls[0]![0];
    expect(createArgs.data.patientId).toMatch(/^TEMP-/);
    expect(createArgs.data).not.toHaveProperty("sequenceNumber");

    expect(tx.patient.update).toHaveBeenCalledWith({
      where: { id: "new-id" },
      data: { patientId: "PT-000042" },
    });
    expect(patient.patientId).toBe("PT-000042");
  });

  it("audits creation with the final, immutable patient ID", async () => {
    db.patient.findMany.mockResolvedValue([]);
    tx.patient.create.mockResolvedValue({ id: "new-id", sequenceNumber: 9 });
    tx.patient.update.mockResolvedValue({ id: "new-id", patientId: formatPatientId(9) });

    await createPatient(actor, registrationInput);

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "patient.created", entityId: "new-id", metadata: { patientId: "PT-000009" } }),
    );
  });
});

describe("getPatientTimeline", () => {
  it("merges all required patient event types into newest-first chronological order", async () => {
    db.appointment.findMany.mockResolvedValue([{
      id: "appointment-1",
      date: new Date("2026-03-01T00:00:00.000Z"),
      startTime: new Date("1970-01-01T09:30:00.000Z"),
      reason: "Follow-up",
      status: "COMPLETED",
      doctor: { fullName: "Dr. Rivera" },
    }]);
    db.consultation.findMany.mockResolvedValue([{
      id: "consultation-1", createdAt: new Date("2026-03-02T10:00:00.000Z"), diagnosis: "Routine", status: "COMPLETED", doctor: { fullName: "Dr. Rivera" },
    }]);
    db.prescription.findMany.mockResolvedValue([{
      id: "prescription-1", prescriptionNumber: "RX-000001", status: "ISSUED", issuedAt: new Date("2026-03-03T10:00:00.000Z"), createdAt: new Date("2026-03-03T09:00:00.000Z"), doctor: { fullName: "Dr. Rivera" },
    }]);
    db.labOrder.findMany.mockResolvedValue([{
      id: "lab-1", orderNumber: "LAB-000001", status: "REVIEWED", createdAt: new Date("2026-03-04T10:00:00.000Z"),
    }]);
    db.document.findMany.mockResolvedValue([{
      id: "document-1", fileName: "Referral.pdf", status: "ACTIVE", createdAt: new Date("2026-03-05T10:00:00.000Z"), category: { name: "Referral" },
    }]);
    db.invoice.findMany.mockResolvedValue([{
      id: "invoice-1", invoiceNumber: "INV-000001", status: "PAID", createdAt: new Date("2026-03-06T10:00:00.000Z"),
    }]);

    const timeline = await getPatientTimeline(actor, "patient-1");

    expect(timeline.map((event) => event.type)).toEqual([
      "INVOICE", "DOCUMENT", "LAB_ORDER", "PRESCRIPTION", "CONSULTATION", "APPOINTMENT",
    ]);
    expect(timeline[0]).toMatchObject({ title: "Invoice INV-000001", href: "/billing/invoice-1" });
    expect(db.patient.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "patient-1" } }));
    for (const model of [db.appointment, db.consultation, db.prescription, db.labOrder, db.document, db.invoice]) {
      expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId: "patient-1" } }));
    }
  });

  it("does not query timeline records when the patient is outside the doctor's assignment scope", async () => {
    db.patient.findFirst.mockResolvedValue(null);
    const doctorActor = { profile: { id: "doctor-1", role: Role.DOCTOR } } as CurrentUser;

    await expect(getPatientTimeline(doctorActor, "patient-2")).rejects.toThrow("Patient not found");
    expect(db.appointment.findMany).not.toHaveBeenCalled();
    expect(db.consultation.findMany).not.toHaveBeenCalled();
  });

  it("scopes a doctor's timeline to assigned patients and omits billing records", async () => {
    const doctorActor = { profile: { id: "doctor-1", role: Role.DOCTOR } } as CurrentUser;

    await getPatientTimeline(doctorActor, "patient-1");

    expect(db.patient.findFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        appointments: {
          some: {
            doctor: { staffProfileId: "doctor-1" },
            status: { notIn: ["CANCELLED", "NO_SHOW", "REQUESTED"] },
          },
        },
      },
      select: { id: true },
    });
    expect(db.invoice.findMany).not.toHaveBeenCalled();
  });
});

describe("listPatients access audit", () => {
  it("records access for each patient row returned by the scoped list", async () => {
    db.patient.findMany.mockResolvedValue([{ id: "patient-1" }, { id: "patient-2" }]);
    db.patient.count.mockResolvedValue(2);

    await listPatients(actor, { page: 1, pageSize: 10 });

    expect(recordAuditEvent).toHaveBeenCalledTimes(2);
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "receptionist-1",
      actorRole: Role.RECEPTIONIST,
      action: "patient.viewed",
      entityType: "Patient",
      entityId: "patient-1",
    }));
  });
});
