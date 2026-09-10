import { patientScope } from "@/lib/permissions/record-scope";
import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, Role, type LabOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan, ForbiddenError } from "@/lib/permissions/policies";
import {
  canCompleteLabOrder,
  formatLabOrderNumber,
  isValidTransition,
} from "@/lib/laboratory";
import { recordAuditEvent } from "@/server/services/audit-service";
import {
  ALLOWED_LAB_REPORT_TYPES,
  MAX_LAB_REPORT_BYTES,
  getLabReportSignedUrl,
  uploadLabReport,
} from "@/lib/storage";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  ChangeLabOrderStatusInput,
  CreateLabOrderInput,
  SaveResultsInput,
} from "@/lib/validation/lab-orders";

/** A doctor may place/cancel only their own orders; admins may manage any doctor's. */
function assertOwnsOrder(actor: CurrentUser, orderedById: string) {
  if (actor.profile.role === Role.DOCTOR && orderedById !== actor.profile.id) {
    throw new ForbiddenError("laboratory:manage-orders");
  }
}

const labOrderInclude = {
  patient: {
    select: {
      id: true,
      patientId: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      sex: true,
    },
  },
  orderedBy: { select: { id: true, fullName: true, role: true } },
  reviewedBy: { select: { id: true, fullName: true, role: true } },
  items: { include: { labTest: true }, orderBy: { id: "asc" as const } },
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    include: { changedBy: { select: { fullName: true, role: true } } },
  },
  reports: {
    orderBy: { createdAt: "desc" as const },
    include: { uploadedBy: { select: { fullName: true } } },
  },
} satisfies Prisma.LabOrderInclude;

export type ListLabOrdersParams = {
  patientId?: string;
  orderedById?: string;
  consultationId?: string;
  status?: LabOrderStatus;
  page?: number;
  pageSize?: number;
};

export async function listLabOrders(actor: CurrentUser, params: ListLabOrdersParams) {
  assertCan(actor.profile.role, "laboratory:view");

  const where: Prisma.LabOrderWhereInput = {
    patient: patientScope(actor),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.orderedById ? { orderedById: params.orderedById } : {}),
    ...(params.consultationId ? { consultationId: params.consultationId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [items, total] = await Promise.all([
    prisma.labOrder.findMany({
      where,
      include: labOrderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.labOrder.count({ where }),
  ]);

  return { items, total };
}

export async function getLabOrderById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "laboratory:view");

  const order = await prisma.labOrder.findFirst({ where: { id, patient: patientScope(actor) }, include: labOrderInclude });
  if (!order) return null;

  const reports = await Promise.all(
    order.reports.map(async (r) => ({ ...r, signedUrl: await getLabReportSignedUrl(r.storagePath) })),
  );

  return { ...order, reports };
}

export async function createLabOrder(actor: CurrentUser, input: CreateLabOrderInput) {
  assertCan(actor.profile.role, "laboratory:manage-orders");
  if (!await prisma.patient.findFirst({ where: { id: input.patientId, status: "ACTIVE", ...patientScope(actor) }, select: { id: true } })) throw new Error("Patient not found.");
  if (input.consultationId && !await prisma.consultation.findFirst({ where: { id: input.consultationId, patientId: input.patientId }, select: { id: true } })) throw new Error("Consultation does not belong to this patient.");

  const tests = await prisma.labTest.findMany({ where: { id: { in: input.testIds } } });
  if (tests.length !== input.testIds.length) {
    throw new Error("One or more selected tests could not be found.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.labOrder.create({
      data: {
        orderNumber: `PENDING-${randomUUID()}`,
        patientId: input.patientId,
        consultationId: input.consultationId || null,
        orderedById: actor.profile.id,
      },
    });

    await tx.labOrderItem.createMany({
      data: tests.map((test) => ({
        labOrderId: created.id,
        labTestId: test.id,
        priceCents: test.priceCents,
        unit: test.unit,
        referenceRange: test.referenceRangeText,
      })),
    });

    await tx.labOrderStatusHistory.create({
      data: { labOrderId: created.id, fromStatus: null, toStatus: "ORDERED", changedById: actor.profile.id },
    });

    return tx.labOrder.update({
      where: { id: created.id },
      data: { orderNumber: formatLabOrderNumber(created.sequenceNumber) },
    });
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "lab_order.created",
    entityType: "LabOrder",
    entityId: order.id,
    metadata: { testIds: input.testIds },
  });

  return order;
}

async function requireOrder(id: string) {
  const order = await prisma.labOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new Error("Lab order not found.");
  return order;
}

/** Different target statuses are gated by different roles: sample handling and result entry
 * belong to lab technicians, review/release to doctors, and cancellation to whoever ordered it
 * (or an admin) — mirroring how Phase 4 split consultation vitals from clinical fields. */
function assertCanTransition(
  actor: CurrentUser,
  order: { orderedById: string },
  toStatus: LabOrderStatus,
) {
  if (toStatus === "CANCELLED") {
    assertCan(actor.profile.role, "laboratory:manage-orders");
    assertOwnsOrder(actor, order.orderedById);
  } else if (toStatus === "REVIEWED") {
    assertCan(actor.profile.role, "laboratory:review");
  } else {
    assertCan(actor.profile.role, "laboratory:manage-samples");
  }
}

export async function changeLabOrderStatus(
  actor: CurrentUser,
  id: string,
  input: ChangeLabOrderStatusInput,
) {
  const order = await requireOrder(id);
  assertCanTransition(actor, order, input.toStatus);

  if (order.status !== input.fromStatus) {
    throw new Error("This order's status changed since you loaded it. Refresh and retry.");
  }
  if (!isValidTransition(order.status, input.toStatus)) {
    throw new Error("That status change isn't allowed from the current status.");
  }
  if (input.toStatus === "COMPLETED" && !canCompleteLabOrder(order.items)) {
    throw new Error("Enter a result for every test before marking this order complete.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.labOrder.update({
      where: { id },
      data: {
        status: input.toStatus,
        ...(input.toStatus === "REVIEWED"
          ? { reviewedAt: new Date(), reviewedById: actor.profile.id }
          : {}),
      },
    });
    await tx.labOrderStatusHistory.create({
      data: {
        labOrderId: id,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason || null,
        changedById: actor.profile.id,
      },
    });
    return next;
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "lab_order.status_changed",
    entityType: "LabOrder",
    entityId: id,
    metadata: { from: input.fromStatus, to: input.toStatus, reason: input.reason },
  });

  return updated;
}

export async function saveResults(actor: CurrentUser, id: string, input: SaveResultsInput) {
  assertCan(actor.profile.role, "laboratory:manage-samples");
  const order = await requireOrder(id);
  if (order.status !== "PROCESSING") {
    throw new Error("Move this order to Processing before entering results.");
  }

  const validItemIds = new Set(order.items.map((item) => item.id));
  for (const item of input.items) {
    if (!validItemIds.has(item.itemId)) throw new Error("Unknown result line item.");
  }

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.labOrderItem.update({
        where: { id: item.itemId },
        data: {
          resultValue: item.resultValue || null,
          unit: item.unit,
          referenceRange: item.referenceRange,
          abnormalFlag: item.abnormalFlag,
          enteredAt: new Date(),
          enteredById: actor.profile.id,
        },
      }),
    ),
  );

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "lab_order.results_saved",
    entityType: "LabOrder",
    entityId: id,
  });
}

export async function addLabReport(actor: CurrentUser, id: string, file: File) {
  assertCan(actor.profile.role, "laboratory:manage-samples");
  const order = await requireOrder(id);
  if (order.status === "CANCELLED") {
    throw new Error("Cannot attach a report to a cancelled order.");
  }

  if (!ALLOWED_LAB_REPORT_TYPES.has(file.type)) {
    throw new Error("Only PDF, PNG or JPEG reports are supported.");
  }
  if (file.size > MAX_LAB_REPORT_BYTES) {
    throw new Error("Report file is too large (max 10MB).");
  }

  const storagePath = await uploadLabReport(id, file);

  await prisma.labReport.create({
    data: {
      labOrderId: id,
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
    action: "lab_order.report_uploaded",
    entityType: "LabOrder",
    entityId: id,
    metadata: { fileName: file.name },
  });
}
