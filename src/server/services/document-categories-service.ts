import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { NameOnlyInput } from "@/lib/validation/doctors";
import type { RecordStatus } from "@prisma/client";

export type ListDocumentCategoriesParams = {
  search?: string;
  status?: RecordStatus;
  page: number;
  pageSize: number;
};

export async function listDocumentCategories({ search, status, page, pageSize }: ListDocumentCategoriesParams) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.documentCategory.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.documentCategory.count({ where }),
  ]);

  return { items, total };
}

/** Active categories only, for the upload form's select. */
export async function listActiveDocumentCategories() {
  return prisma.documentCategory.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
}

export async function createDocumentCategory(actor: CurrentUser, input: NameOnlyInput) {
  assertCan(actor.profile.role, "document-categories:manage");

  const category = await prisma.documentCategory.create({ data: { name: input.name } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "document_category.created",
    entityType: "DocumentCategory",
    entityId: category.id,
  });

  return category;
}

export async function updateDocumentCategory(actor: CurrentUser, id: string, input: NameOnlyInput) {
  assertCan(actor.profile.role, "document-categories:manage");

  const category = await prisma.documentCategory.update({ where: { id }, data: { name: input.name } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "document_category.updated",
    entityType: "DocumentCategory",
    entityId: category.id,
  });

  return category;
}

export async function setDocumentCategoryStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "document-categories:manage");

  const category = await prisma.documentCategory.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "document_category.archived" : "document_category.unarchived",
    entityType: "DocumentCategory",
    entityId: category.id,
  });

  return category;
}
