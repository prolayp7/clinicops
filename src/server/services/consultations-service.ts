import { doctorScope } from "@/lib/permissions/record-scope";
import "server-only";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan, can, ForbiddenError } from "@/lib/permissions/policies";
import { CLINICAL_FIELD_KEYS, computeChangedFields } from "@/lib/consultations";
import { recordAuditEvent } from "@/server/services/audit-service";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  getAttachmentSignedUrl,
  uploadConsultationAttachment,
} from "@/lib/storage";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  AmendConsultationFormInput,
  CompleteConsultationFormInput,
  SaveDraftInput,
} from "@/lib/validation/consultations";

/** A doctor may manage only their own consultations; admins may manage any doctor's. */
function assertOwnsConsultation(actor: CurrentUser, doctorStaffProfileId: string) {
  if (actor.profile.role === Role.DOCTOR && doctorStaffProfileId !== actor.profile.id) {
    throw new ForbiddenError("consultations:manage-clinical");
  }
}

const consultationInclude = {
  patient: {
    select: {
      id: true,
      patientId: true,
      firstName: true,
      lastName: true,
      allergies: true,
      currentMedications: true,
    },
  },
  doctor: { select: { id: true, fullName: true, staffProfileId: true } },
  appointment: { select: { id: true, date: true, startTime: true, reason: true, status: true } },
  amendments: {
    orderBy: { createdAt: "desc" as const },
    include: { amendedBy: { select: { fullName: true, role: true } } },
  },
  attachments: {
    orderBy: { createdAt: "desc" as const },
    include: { uploadedBy: { select: { fullName: true } } },
  },
} satisfies Prisma.ConsultationInclude;

export type ListConsultationQueueParams = {
  date?: string;
  doctorId?: string;
};

/** The active queue: appointments ready for (or currently in) a consultation. */
export async function listConsultationQueue(actor: CurrentUser, params: ListConsultationQueueParams) {
  assertCan(actor.profile.role, "consultations:view");

  return prisma.appointment.findMany({
    where: {
      status: { in: ["WAITING", "IN_CONSULTATION"] },
      ...(params.date ? { date: new Date(params.date) } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...doctorScope(actor),
    },
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, fullName: true } },
      consultation: { select: { id: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function listRecentConsultations(
  actor: CurrentUser,
  params: { patientId?: string; doctorId?: string; take?: number } = {},
) {
  assertCan(actor.profile.role, "consultations:view");

  return prisma.consultation.findMany({
    where: {
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...doctorScope(actor),
    },
    include: {
      patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 20,
  });
}

export async function getConsultationById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "consultations:view");

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: consultationInclude,
  });
  if (!consultation) return null;
  assertOwnsConsultation(actor, consultation.doctor.staffProfileId);

  const attachments = await Promise.all(
    consultation.attachments.map(async (a) => ({
      ...a,
      signedUrl: await getAttachmentSignedUrl(a.storagePath),
    })),
  );

  return { ...consultation, attachments };
}

/** Starts a consultation for a checked-in/waiting appointment, or returns the existing one if the
 * appointment is already in consultation. Flips the appointment to IN_CONSULTATION atomically
 * with creating the record so the two can never disagree. */
export async function startOrResumeConsultation(actor: CurrentUser, appointmentId: string) {
  assertCan(actor.profile.role, "consultations:manage-vitals");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { consultation: true, doctor: { select: { staffProfileId: true } } },
  });
  if (!appointment) throw new Error("Appointment not found.");
  assertOwnsConsultation(actor, appointment.doctor.staffProfileId);

  if (appointment.consultation) return appointment.consultation;

  if (appointment.status !== "WAITING" && appointment.status !== "IN_CONSULTATION") {
    throw new Error("Check the patient in and mark them waiting before starting a consultation.");
  }

  const consultation = await prisma.$transaction(async (tx) => {
    const created = await tx.consultation.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      },
    });

    if (appointment.status === "WAITING") {
      await tx.appointment.update({ where: { id: appointment.id }, data: { status: "IN_CONSULTATION" } });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "WAITING",
          toStatus: "IN_CONSULTATION",
          changedById: actor.profile.id,
        },
      });
    }

    return created;
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "consultation.started",
    entityType: "Consultation",
    entityId: consultation.id,
    metadata: { appointmentId: appointment.id },
  });

  return consultation;
}

function splitDraftFields(input: SaveDraftInput | CompleteConsultationFormInput | AmendConsultationFormInput) {
  const { bloodPressureSystolic, bloodPressureDiastolic, pulseBpm, temperatureCelsius, respiratoryRate, oxygenSaturationPercent, heightCm, weightKg } =
    input;
  const { symptoms, diagnosis, clinicalNotes, treatmentPlan, followUpDate } = input;
  return {
    vitals: {
      bloodPressureSystolic,
      bloodPressureDiastolic,
      pulseBpm,
      temperatureCelsius,
      respiratoryRate,
      oxygenSaturationPercent,
      heightCm,
      weightKg,
    },
    clinical: {
      symptoms,
      diagnosis,
      clinicalNotes,
      treatmentPlan,
      followUpDate: followUpDate ? new Date(followUpDate) : followUpDate,
    },
  };
}

async function requireConsultation(id: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { doctor: { select: { staffProfileId: true } } },
  });
  if (!consultation) throw new Error("Consultation not found.");
  return consultation;
}

export async function saveDraft(actor: CurrentUser, id: string, input: SaveDraftInput) {
  const consultation = await requireConsultation(id);
  if (consultation.status !== "DRAFT") {
    throw new Error("This consultation is completed. Use Amend to make a reasoned change.");
  }

  const canVitals = can(actor.profile.role, "consultations:manage-vitals");
  const canClinical = can(actor.profile.role, "consultations:manage-clinical");
  if (!canVitals && !canClinical) assertCan(actor.profile.role, "consultations:manage-vitals");
  if (canClinical) assertOwnsConsultation(actor, consultation.doctor.staffProfileId);

  const { vitals, clinical } = splitDraftFields(input);

  await prisma.consultation.update({
    where: { id },
    data: {
      ...(canVitals ? vitals : {}),
      ...(canClinical ? clinical : {}),
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "consultation.draft_saved",
    entityType: "Consultation",
    entityId: id,
  });
}

export async function completeConsultation(
  actor: CurrentUser,
  id: string,
  input: CompleteConsultationFormInput,
) {
  assertCan(actor.profile.role, "consultations:manage-clinical");
  const consultation = await requireConsultation(id);
  assertOwnsConsultation(actor, consultation.doctor.staffProfileId);
  if (consultation.status !== "DRAFT") {
    throw new Error("This consultation is already completed.");
  }

  const { vitals, clinical } = splitDraftFields(input);

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({
      where: { id },
      data: { ...vitals, ...clinical, status: "COMPLETED", completedAt: new Date() },
    });

    const appointment = await tx.appointment.findUnique({ where: { id: consultation.appointmentId } });
    if (appointment?.status === "IN_CONSULTATION") {
      await tx.appointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED" } });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: "IN_CONSULTATION",
          toStatus: "COMPLETED",
          changedById: actor.profile.id,
        },
      });
    }
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "consultation.completed",
    entityType: "Consultation",
    entityId: id,
  });
}

export async function amendConsultation(
  actor: CurrentUser,
  id: string,
  input: AmendConsultationFormInput,
) {
  assertCan(actor.profile.role, "consultations:manage-clinical");
  const consultation = await requireConsultation(id);
  assertOwnsConsultation(actor, consultation.doctor.staffProfileId);
  if (consultation.status !== "COMPLETED") {
    throw new Error("Only a completed consultation can be amended.");
  }

  const { vitals, clinical } = splitDraftFields(input);
  const nextValues = { ...vitals, ...clinical };
  const changedFields = computeChangedFields(consultation, nextValues, CLINICAL_FIELD_KEYS);

  if (changedFields.length === 0) {
    throw new Error("No fields were changed.");
  }

  const snapshot: Record<string, string | number | null> = {};
  for (const key of CLINICAL_FIELD_KEYS) {
    const value = consultation[key];
    snapshot[key] = value instanceof Date ? value.toISOString() : value;
  }

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({ where: { id }, data: nextValues });
    await tx.consultationAmendment.create({
      data: {
        consultationId: id,
        reason: input.reason,
        changedFields,
        snapshot,
        amendedById: actor.profile.id,
      },
    });
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "consultation.amended",
    entityType: "Consultation",
    entityId: id,
    metadata: { reason: input.reason, changedFields },
  });
}

export async function addAttachment(actor: CurrentUser, id: string, file: File) {
  assertCan(actor.profile.role, "consultations:manage-vitals");
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Only PDF, PNG or JPEG attachments are supported.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment is too large (max 10MB).");
  }

  const consultation = await requireConsultation(id);
  const { storagePath } = await uploadConsultationAttachment(id, file);

  await prisma.consultationAttachment.create({
    data: {
      consultationId: id,
      fileName: file.name,
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: actor.profile.id,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "consultation.attachment_added",
    entityType: "Consultation",
    entityId: id,
    metadata: { fileName: file.name },
  });

  return consultation;
}
