import "server-only";
import { Prisma, type RecordStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan, ForbiddenError } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import {
  ALLOWED_SIGNATURE_TYPES,
  MAX_SIGNATURE_BYTES,
  uploadDoctorSignature,
} from "@/lib/storage";
import type { CurrentUser } from "@/lib/auth/session";
import type { DoctorInput } from "@/lib/validation/doctors";

const doctorWithRelations = Prisma.validator<Prisma.DoctorInclude>()({
  department: true,
  specialization: true,
});

export type ListDoctorsParams = {
  search?: string;
  departmentId?: string;
  specializationId?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listDoctors({
  search,
  departmentId,
  specializationId,
  status,
  page,
  pageSize,
}: ListDoctorsParams) {
  const where: Prisma.DoctorWhereInput = {
    ...(status ? { status } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(specializationId ? { specializationId } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { licenseNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: doctorWithRelations,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.doctor.count({ where }),
  ]);

  return { items, total };
}

export async function getDoctorById(id: string) {
  return prisma.doctor.findUnique({
    where: { id },
    include: {
      ...doctorWithRelations,
      availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      leaves: { orderBy: { startDate: "desc" } },
    },
  });
}

export async function getDoctorByStaffProfileId(staffProfileId: string) {
  return prisma.doctor.findUnique({ where: { staffProfileId } });
}

/** Staff accounts with the DOCTOR role that don't have a clinical directory entry yet —
 * candidates for the "Register Doctor" form. */
export async function listUnlinkedDoctorStaffProfiles() {
  return prisma.staffProfile.findMany({
    where: { role: Role.DOCTOR, status: "ACTIVE", doctor: null },
    orderBy: { fullName: "asc" },
  });
}

export async function createDoctor(
  actor: CurrentUser,
  input: DoctorInput & { staffProfileId: string },
) {
  assertCan(actor.profile.role, "doctors:manage");

  const staffProfile = await prisma.staffProfile.findUnique({
    where: { id: input.staffProfileId },
  });
  if (!staffProfile || staffProfile.role !== Role.DOCTOR) {
    throw new Error("Select a staff account with the Doctor role.");
  }

  const doctor = await prisma.doctor.create({
    data: {
      staffProfileId: input.staffProfileId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
      departmentId: input.departmentId,
      specializationId: input.specializationId,
      qualifications: input.qualifications,
      consultationFeeCents: input.consultationFeeCents,
      slotDurationMinutes: input.slotDurationMinutes,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor.created",
    entityType: "Doctor",
    entityId: doctor.id,
  });

  return doctor;
}

export async function updateDoctor(actor: CurrentUser, id: string, input: DoctorInput) {
  assertCan(actor.profile.role, "doctors:manage");

  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
      departmentId: input.departmentId,
      specializationId: input.specializationId,
      qualifications: input.qualifications,
      consultationFeeCents: input.consultationFeeCents,
      slotDurationMinutes: input.slotDurationMinutes,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor.updated",
    entityType: "Doctor",
    entityId: doctor.id,
  });

  return doctor;
}

export async function setDoctorStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "doctors:manage");

  const doctor = await prisma.doctor.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "doctor.archived" : "doctor.unarchived",
    entityType: "Doctor",
    entityId: doctor.id,
  });

  return doctor;
}

/** A doctor may upload only their own signature; admins may upload for any doctor. */
export async function uploadDoctorSignatureImage(actor: CurrentUser, doctorId: string, file: File) {
  assertCan(actor.profile.role, "doctors:manage-signature");

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new Error("Doctor not found.");
  if (actor.profile.role === Role.DOCTOR && doctor.staffProfileId !== actor.profile.id) {
    throw new ForbiddenError("doctors:manage-signature");
  }

  if (!ALLOWED_SIGNATURE_TYPES.has(file.type)) {
    throw new Error("Only PNG or JPEG images are supported for a signature.");
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    throw new Error("Signature image is too large (max 2MB).");
  }

  const storagePath = await uploadDoctorSignature(doctorId, file);

  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data: { signatureStoragePath: storagePath },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor.signature_uploaded",
    entityType: "Doctor",
    entityId: doctorId,
  });

  return updated;
}
