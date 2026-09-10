import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { LabTestInput } from "@/lib/validation/lab-tests";
import type { RecordStatus } from "@prisma/client";

export type ListLabTestsParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listLabTests({ search, status, page, pageSize }: ListLabTestsParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.labTest.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.labTest.count({ where }),
  ]);

  return { items, total };
}

/** Active lab tests only, for the order-creation multi-select. */
export async function listActiveLabTests() {
  return prisma.labTest.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createLabTest(actor: CurrentUser, input: LabTestInput) {
  assertCan(actor.profile.role, "laboratory:manage-catalog");

  const labTest = await prisma.labTest.create({ data: input });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "lab_test.created",
    entityType: "LabTest",
    entityId: labTest.id,
  });

  return labTest;
}

export async function updateLabTest(actor: CurrentUser, id: string, input: LabTestInput) {
  assertCan(actor.profile.role, "laboratory:manage-catalog");

  const labTest = await prisma.labTest.update({ where: { id }, data: input });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "lab_test.updated",
    entityType: "LabTest",
    entityId: labTest.id,
  });

  return labTest;
}

export async function setLabTestStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "laboratory:manage-catalog");

  const labTest = await prisma.labTest.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "lab_test.archived" : "lab_test.unarchived",
    entityType: "LabTest",
    entityId: labTest.id,
  });

  return labTest;
}
