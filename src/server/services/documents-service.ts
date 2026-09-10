import { patientScope } from "@/lib/permissions/record-scope";
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  getDocumentSignedUrl,
  uploadDocument,
} from "@/lib/storage";
import type { CurrentUser } from "@/lib/auth/session";
import type { UploadDocumentInput } from "@/lib/validation/documents";
import type { RecordStatus } from "@prisma/client";

const documentInclude = {
  patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
  category: { select: { id: true, name: true } },
  uploadedBy: { select: { fullName: true } },
} satisfies Prisma.DocumentInclude;

export type ListDocumentsParams = {
  patientId?: string;
  categoryId?: string;
  status?: RecordStatus;
  page?: number;
  pageSize?: number;
};

export async function listDocuments(actor: CurrentUser, params: ListDocumentsParams) {
  assertCan(actor.profile.role, "documents:view");

  const where: Prisma.DocumentWhereInput = {
    patient: patientScope(actor),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    status: params.status ?? "ACTIVE",
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  const withUrls = await Promise.all(
    items.map(async (doc) => ({ ...doc, signedUrl: await getDocumentSignedUrl(doc.storagePath) })),
  );

  return { items: withUrls, total };
}

export async function uploadPatientDocument(
  actor: CurrentUser,
  patientId: string,
  input: UploadDocumentInput,
  file: File,
) {
  assertCan(actor.profile.role, "documents:manage");

  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("Only PDF, PNG or JPEG documents are supported.");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("Document is too large (max 10MB).");
  }

  if (input.consultationId && !await prisma.consultation.findFirst({ where: { id: input.consultationId, patientId }, select: { id: true } })) throw new Error("Consultation does not belong to this patient.");
  if (input.labOrderId && !await prisma.labOrder.findFirst({ where: { id: input.labOrderId, patientId }, select: { id: true } })) throw new Error("Lab order does not belong to this patient.");
  const storagePath = await uploadDocument(patientId, file);

  const document = await prisma.document.create({
    data: {
      patientId,
      categoryId: input.categoryId,
      consultationId: input.consultationId || null,
      labOrderId: input.labOrderId || null,
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
    action: "document.uploaded",
    entityType: "Document",
    entityId: document.id,
    metadata: { fileName: file.name, patientId },
  });

  return document;
}

export async function setDocumentStatus(actor: CurrentUser, id: string, status: RecordStatus) {
  assertCan(actor.profile.role, "documents:manage");

  const document = await prisma.document.update({
    where: { id },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "document.archived" : "document.unarchived",
    entityType: "Document",
    entityId: document.id,
  });

  return document;
}
