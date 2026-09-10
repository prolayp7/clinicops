import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { NameOnlyInput } from "@/lib/validation/doctors";
import type { RecordStatus } from "@prisma/client";

export type ListDepartmentsParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listDepartments({ search, status, page, pageSize }: ListDepartmentsParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.department.count({ where }),
  ]);

  return { items, total };
}

/** Active departments only, for select inputs elsewhere (e.g. the doctor form). */
export async function listActiveDepartments() {
  return prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
}

export async function createDepartment(actor: CurrentUser, input: NameOnlyInput) {
  assertCan(actor.profile.role, "departments:manage");

  const department = await prisma.department.create({ data: { name: input.name } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "department.created",
    entityType: "Department",
    entityId: department.id,
  });

  return department;
}

export async function updateDepartment(actor: CurrentUser, id: string, input: NameOnlyInput) {
  assertCan(actor.profile.role, "departments:manage");

  const department = await prisma.department.update({ where: { id }, data: { name: input.name } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "department.updated",
    entityType: "Department",
    entityId: department.id,
  });

  return department;
}

export async function setDepartmentStatus(
  actor: CurrentUser,
  id: string,
  status: RecordStatus,
) {
  assertCan(actor.profile.role, "departments:manage");

  const department = await prisma.department.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "department.archived" : "department.unarchived",
    entityType: "Department",
    entityId: department.id,
  });

  return department;
}
