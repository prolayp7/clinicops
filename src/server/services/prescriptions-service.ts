import { doctorScope, patientScope } from "@/lib/permissions/record-scope";
import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan, ForbiddenError } from "@/lib/permissions/policies";
import { canIssuePrescription, formatPrescriptionNumber } from "@/lib/prescriptions";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { CreatePrescriptionInput, PrescriptionItemInput } from "@/lib/validation/prescriptions";

/** A doctor may manage only their own prescriptions; admins may manage any doctor's. */
function assertOwnsPrescription(actor: CurrentUser, doctorStaffProfileId: string) {
  if (actor.profile.role === Role.DOCTOR && doctorStaffProfileId !== actor.profile.id) {
    throw new ForbiddenError("prescriptions:manage");
  }
}

const prescriptionInclude = {
  patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
  doctor: {
    select: {
      id: true,
      fullName: true,
      staffProfileId: true,
      signatureStoragePath: true,
      licenseNumber: true,
      qualifications: true,
    },
  },
  items: { orderBy: { sortOrder: "asc" as const }, include: { medicine: true } },
} satisfies Prisma.PrescriptionInclude;

export type ListPrescriptionsParams = {
  patientId?: string;
  doctorId?: string;
  status?: "DRAFT" | "ISSUED";
  page?: number;
  pageSize?: number;
};

export async function listPrescriptions(actor: CurrentUser, params: ListPrescriptionsParams) {
  assertCan(actor.profile.role, "prescriptions:view");

  const where: Prisma.PrescriptionWhereInput = {
    ...doctorScope(actor),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [items, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: prescriptionInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.prescription.count({ where }),
  ]);

  return { items, total };
}

export async function getPrescriptionById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "prescriptions:view");

  return prisma.prescription.findFirst({
    where: { id, ...doctorScope(actor) },
    include: {
      ...prescriptionInclude,
      patient: true,
      consultation: { select: { id: true, diagnosis: true } },
    },
  });
}

export async function getPrescriptionByConsultationId(actor: CurrentUser, consultationId: string) {
  assertCan(actor.profile.role, "prescriptions:view");

  return prisma.prescription.findUnique({
    where: { consultationId, ...doctorScope(actor) },
    select: { id: true, prescriptionNumber: true, status: true },
  });
}

export async function createPrescription(actor: CurrentUser, input: CreatePrescriptionInput) {
  assertCan(actor.profile.role, "prescriptions:manage");
  if (!await prisma.patient.findFirst({ where: { id: input.patientId, status: "ACTIVE", ...patientScope(actor) }, select: { id: true } })) throw new Error("Patient not found.");
  if (input.consultationId && !await prisma.consultation.findFirst({ where: { id: input.consultationId, patientId: input.patientId }, select: { id: true } })) throw new Error("Consultation does not belong to this patient.");

  const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
  if (!doctor || doctor.status !== "ACTIVE") throw new Error("Doctor not found or archived.");
  assertOwnsPrescription(actor, doctor.staffProfileId);

  const prescription = await prisma.$transaction(async (tx) => {
    const created = await tx.prescription.create({
      data: {
        prescriptionNumber: `PENDING-${randomUUID()}`,
        patientId: input.patientId,
        doctorId: input.doctorId,
        consultationId: input.consultationId || null,
        notes: input.notes || null,
      },
    });

    return tx.prescription.update({
      where: { id: created.id },
      data: { prescriptionNumber: formatPrescriptionNumber(created.sequenceNumber) },
    });
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "prescription.created",
    entityType: "Prescription",
    entityId: prescription.id,
  });

  return prescription;
}

async function requirePrescription(id: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { doctor: { select: { staffProfileId: true } }, items: true },
  });
  if (!prescription) throw new Error("Prescription not found.");
  return prescription;
}

export async function addPrescriptionItem(
  actor: CurrentUser,
  prescriptionId: string,
  input: PrescriptionItemInput,
) {
  assertCan(actor.profile.role, "prescriptions:manage");
  const prescription = await requirePrescription(prescriptionId);
  assertOwnsPrescription(actor, prescription.doctor.staffProfileId);
  if (prescription.status !== "DRAFT") {
    throw new Error("This prescription has already been issued and can no longer be edited.");
  }

  const maxSortOrder = prescription.items.reduce((max, item) => Math.max(max, item.sortOrder), -1);

  const item = await prisma.prescriptionItem.create({
    data: {
      prescriptionId,
      medicineId: input.medicineId,
      dosage: input.dosage,
      frequency: input.frequency,
      route: input.route,
      duration: input.duration,
      mealInstruction: input.mealInstruction,
      directions: input.directions || null,
      sortOrder: maxSortOrder + 1,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "prescription.item_added",
    entityType: "Prescription",
    entityId: prescriptionId,
    metadata: { medicineId: input.medicineId },
  });

  return item;
}

export async function removePrescriptionItem(
  actor: CurrentUser,
  prescriptionId: string,
  itemId: string,
) {
  assertCan(actor.profile.role, "prescriptions:manage");
  const prescription = await requirePrescription(prescriptionId);
  assertOwnsPrescription(actor, prescription.doctor.staffProfileId);
  if (prescription.status !== "DRAFT") {
    throw new Error("This prescription has already been issued and can no longer be edited.");
  }

  await prisma.prescriptionItem.delete({ where: { id: itemId } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "prescription.item_removed",
    entityType: "Prescription",
    entityId: prescriptionId,
  });
}

export async function issuePrescription(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "prescriptions:manage");
  const prescription = await requirePrescription(id);
  assertOwnsPrescription(actor, prescription.doctor.staffProfileId);
  if (!canIssuePrescription(prescription.status, prescription.items.length)) {
    throw new Error(
      prescription.status !== "DRAFT"
        ? "This prescription has already been issued."
        : "Add at least one medicine before issuing.",
    );
  }

  const issued = await prisma.prescription.update({
    where: { id },
    data: { status: "ISSUED", issuedAt: new Date() },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "prescription.issued",
    entityType: "Prescription",
    entityId: id,
  });

  return issued;
}
