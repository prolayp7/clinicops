import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { NameOnlyInput } from "@/lib/validation/doctors";
import type { RecordStatus } from "@prisma/client";

export type ListSpecializationsParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listSpecializations({
  search,
  status,
  page,
  pageSize,
}: ListSpecializationsParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.specialization.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.specialization.count({ where }),
  ]);

  return { items, total };
}

/** Active specializations only, for select inputs elsewhere (e.g. the doctor form). */
export async function listActiveSpecializations() {
  return prisma.specialization.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
}

export async function createSpecialization(actor: CurrentUser, input: NameOnlyInput) {
  assertCan(actor.profile.role, "specializations:manage");

  const specialization = await prisma.specialization.create({ data: { name: input.name } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "specialization.created",
    entityType: "Specialization",
    entityId: specialization.id,
  });

  return specialization;
}

export async function updateSpecialization(
  actor: CurrentUser,
  id: string,
  input: NameOnlyInput,
) {
  assertCan(actor.profile.role, "specializations:manage");

  const specialization = await prisma.specialization.update({
    where: { id },
    data: { name: input.name },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "specialization.updated",
    entityType: "Specialization",
    entityId: specialization.id,
  });

  return specialization;
}

export async function setSpecializationStatus(
  actor: CurrentUser,
  id: string,
  status: RecordStatus,
) {
  assertCan(actor.profile.role, "specializations:manage");

  const specialization = await prisma.specialization.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "specialization.archived" : "specialization.unarchived",
    entityType: "Specialization",
    entityId: specialization.id,
  });

  return specialization;
}
