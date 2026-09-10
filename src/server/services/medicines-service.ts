import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { MedicineInput } from "@/lib/validation/medicines";
import type { RecordStatus } from "@prisma/client";

export type ListMedicinesParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listMedicines({ search, status, page, pageSize }: ListMedicinesParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.medicine.count({ where }),
  ]);

  return { items, total };
}

/** Active medicines only, for the prescription item autocomplete. */
export async function listActiveMedicines(search?: string) {
  return prisma.medicine.findMany({
    where: {
      status: "ACTIVE",
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}

export async function createMedicine(actor: CurrentUser, input: MedicineInput) {
  assertCan(actor.profile.role, "medicines:manage");

  const medicine = await prisma.medicine.create({ data: input });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "medicine.created",
    entityType: "Medicine",
    entityId: medicine.id,
  });

  return medicine;
}

export async function updateMedicine(actor: CurrentUser, id: string, input: MedicineInput) {
  assertCan(actor.profile.role, "medicines:manage");

  const medicine = await prisma.medicine.update({ where: { id }, data: input });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "medicine.updated",
    entityType: "Medicine",
    entityId: medicine.id,
  });

  return medicine;
}

export async function setMedicineStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "medicines:manage");

  const medicine = await prisma.medicine.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "medicine.archived" : "medicine.unarchived",
    entityType: "Medicine",
    entityId: medicine.id,
  });

  return medicine;
}
