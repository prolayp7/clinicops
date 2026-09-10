import "server-only";
import { patientScope } from "@/lib/permissions/record-scope";
import crypto from "node:crypto";
import { Prisma, type RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { formatPatientId, normalizeEmail, normalizePhone } from "@/lib/patients";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  PatientClinicalInput,
  PatientDemographicsInput,
  PatientRegistrationInput,
} from "@/lib/validation/patients";

export type DuplicateCandidate = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  email: string | null;
};

export class DuplicateWarningError extends Error {
  constructor(public duplicates: DuplicateCandidate[]) {
    super("Possible duplicate patients found. Review before registering.");
    this.name = "DuplicateWarningError";
  }
}

const duplicateSelect = {
  id: true,
  patientId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  phone: true,
  email: true,
} satisfies Prisma.PatientSelect;

async function findPossibleDuplicates(
  input: { firstName: string; lastName: string; dateOfBirth: string; normalizedPhone: string; normalizedEmail: string | null },
  excludeId?: string,
): Promise<DuplicateCandidate[]> {
  return prisma.patient.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { normalizedPhone: input.normalizedPhone },
        ...(input.normalizedEmail ? [{ normalizedEmail: input.normalizedEmail }] : []),
        {
          firstName: { equals: input.firstName, mode: "insensitive" },
          lastName: { equals: input.lastName, mode: "insensitive" },
          dateOfBirth: new Date(input.dateOfBirth),
        },
      ],
    },
    select: duplicateSelect,
    take: 5,
  });
}

export type ListPatientsParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listPatients(actor: CurrentUser, { search, status, page, pageSize }: ListPatientsParams) {
  assertCan(actor.profile.role, "patients:view");

  const where: Prisma.PatientWhereInput = {
    ...patientScope(actor),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { patientId: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return { items, total };
}

export async function getPatientById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "patients:view");

  const patient = await prisma.patient.findFirst({ where: { id, ...patientScope(actor) } });
  if (!patient) return null;

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient.viewed",
    entityType: "Patient",
    entityId: patient.id,
  });

  return patient;
}

export async function getPatientTimeline(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "audit-logs:view");
  return prisma.auditLog.findMany({
    where: { entityType: "Patient", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { fullName: true, role: true } } },
    take: 100,
  });
}

export async function createPatient(
  actor: CurrentUser,
  input: PatientRegistrationInput,
  options: { force?: boolean } = {},
) {
  assertCan(actor.profile.role, "patients:manage");

  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;

  if (!options.force) {
    const duplicates = await findPossibleDuplicates({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      normalizedPhone,
      normalizedEmail,
    });
    if (duplicates.length > 0) {
      throw new DuplicateWarningError(duplicates);
    }
  }

  const patient = await prisma.$transaction(async (tx) => {
    const placeholder = `TEMP-${crypto.randomUUID()}`;
    const created = await tx.patient.create({
      data: {
        patientId: placeholder,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        sex: input.sex,
        phone: input.phone,
        normalizedPhone,
        email: input.email || null,
        normalizedEmail,
        addressLine1: input.addressLine1 || null,
        addressLine2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        postalCode: input.postalCode || null,
        country: input.country || null,
        emergencyContactName: input.emergencyContactName || null,
        emergencyContactPhone: input.emergencyContactPhone || null,
        emergencyContactRelationship: input.emergencyContactRelationship || null,
        allergies: input.allergies,
        medicalHistory: input.medicalHistory || null,
        previousDiagnoses: input.previousDiagnoses,
        currentMedications: input.currentMedications,
      },
    });

    return tx.patient.update({
      where: { id: created.id },
      data: { patientId: formatPatientId(created.sequenceNumber) },
    });
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient.created",
    entityType: "Patient",
    entityId: patient.id,
    metadata: { patientId: patient.patientId },
  });

  return patient;
}

export async function updatePatientDemographics(
  actor: CurrentUser,
  id: string,
  input: PatientDemographicsInput,
) {
  assertCan(actor.profile.role, "patients:manage");

  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
      sex: input.sex,
      phone: input.phone,
      normalizedPhone,
      email: input.email || null,
      normalizedEmail,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      state: input.state || null,
      postalCode: input.postalCode || null,
      country: input.country || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      emergencyContactRelationship: input.emergencyContactRelationship || null,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient.updated",
    entityType: "Patient",
    entityId: patient.id,
  });

  return patient;
}

export async function updatePatientClinical(
  actor: CurrentUser,
  id: string,
  input: PatientClinicalInput,
) {
  assertCan(actor.profile.role, "patients:manage-clinical");
  if (!await prisma.patient.findFirst({ where: { id, ...patientScope(actor) }, select: { id: true } })) throw new Error("Patient not found.");

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      allergies: input.allergies,
      medicalHistory: input.medicalHistory || null,
      previousDiagnoses: input.previousDiagnoses,
      currentMedications: input.currentMedications,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient.clinical_updated",
    entityType: "Patient",
    entityId: patient.id,
  });

  return patient;
}

export async function setPatientStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "patients:manage");

  const patient = await prisma.patient.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "patient.archived" : "patient.unarchived",
    entityType: "Patient",
    entityId: patient.id,
  });

  return patient;
}
