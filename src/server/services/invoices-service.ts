import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import {
  computeInvoiceStatus,
  computeInvoiceTotal,
  computeItemAmount,
  formatInvoiceNumber,
  isInvoiceEditable,
  maxRefundableCents,
} from "@/lib/billing";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  CreateInvoiceInput,
  InvoiceItemInput,
  RecordPaymentInput,
  RecordRefundInput,
  UpdateInvoiceAdjustmentsInput,
} from "@/lib/validation/billing";

const invoiceInclude = {
  patient: { select: { id: true, patientId: true, firstName: true, lastName: true } },
  createdBy: { select: { fullName: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      consultation: { select: { id: true, diagnosis: true } },
      labOrder: { select: { id: true, orderNumber: true } },
    },
  },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      recordedBy: { select: { fullName: true } },
      refunds: { include: { recordedBy: { select: { fullName: true } } } },
    },
  },
} satisfies Prisma.InvoiceInclude;

/** Recomputes and persists subtotal/total/paid/status from the underlying items, payments and
 * refunds — called inside the same transaction as every mutation so the cache can never drift. */
async function recalculateInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true, payments: { include: { refunds: true } } },
  });

  const subtotalCents = invoice.items.reduce((sum, item) => sum + item.amountCents, 0);
  const totalCents = computeInvoiceTotal({
    subtotalCents,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    adjustmentCents: invoice.adjustmentCents,
  });
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const totalRefunded = invoice.payments.reduce(
    (sum, p) => sum + p.refunds.reduce((rSum, r) => rSum + r.amountCents, 0),
    0,
  );
  const paidCents = totalPaid - totalRefunded;
  const status = computeInvoiceStatus(totalCents, paidCents, totalRefunded > 0);

  return tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotalCents, totalCents, paidCents, status },
  });
}

export type ListInvoicesParams = {
  patientId?: string;
  status?: Prisma.InvoiceWhereInput["status"];
  page?: number;
  pageSize?: number;
};

export async function listInvoices(actor: CurrentUser, params: ListInvoicesParams) {
  assertCan(actor.profile.role, "billing:view");

  const where: Prisma.InvoiceWhereInput = {
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total };
}

export async function getInvoiceById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "billing:view");

  return prisma.invoice.findUnique({
    where: { id },
    include: { ...invoiceInclude, patient: true },
  });
}

export async function createInvoice(actor: CurrentUser, input: CreateInvoiceInput) {
  assertCan(actor.profile.role, "billing:manage-invoices");

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber: `PENDING-${randomUUID()}`,
        patientId: input.patientId,
        createdById: actor.profile.id,
        dueDate: input.dueDate || null,
        notes: input.notes || null,
      },
    });

    return tx.invoice.update({
      where: { id: created.id },
      data: { invoiceNumber: formatInvoiceNumber(created.sequenceNumber) },
    });
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "invoice.created",
    entityType: "Invoice",
    entityId: invoice.id,
  });

  return invoice;
}

async function requireInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
  if (!invoice) throw new Error("Invoice not found.");
  return invoice;
}

export async function addInvoiceItem(actor: CurrentUser, invoiceId: string, input: InvoiceItemInput) {
  assertCan(actor.profile.role, "billing:manage-invoices");
  const invoice = await requireInvoice(invoiceId);
  if (!isInvoiceEditable(invoice.payments.length)) {
    throw new Error("This invoice has payments recorded and can no longer be edited.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.create({
      data: {
        invoiceId,
        category: input.category,
        description: input.description,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents,
        amountCents: computeItemAmount(input.quantity, input.unitPriceCents),
        consultationId: input.consultationId || null,
        labOrderId: input.labOrderId || null,
      },
    });
    await recalculateInvoice(tx, invoiceId);
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "invoice.item_added",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { description: input.description },
  });
}

export async function removeInvoiceItem(actor: CurrentUser, invoiceId: string, itemId: string) {
  assertCan(actor.profile.role, "billing:manage-invoices");
  const invoice = await requireInvoice(invoiceId);
  if (!isInvoiceEditable(invoice.payments.length)) {
    throw new Error("This invoice has payments recorded and can no longer be edited.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.delete({ where: { id: itemId } });
    await recalculateInvoice(tx, invoiceId);
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "invoice.item_removed",
    entityType: "Invoice",
    entityId: invoiceId,
  });
}

export async function updateInvoiceAdjustments(
  actor: CurrentUser,
  invoiceId: string,
  input: UpdateInvoiceAdjustmentsInput,
) {
  assertCan(actor.profile.role, "billing:manage-invoices");
  const invoice = await requireInvoice(invoiceId);
  if (!isInvoiceEditable(invoice.payments.length)) {
    throw new Error("This invoice has payments recorded and can no longer be edited.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        discountCents: input.discountCents,
        taxCents: input.taxCents,
        adjustmentCents: input.adjustmentCents,
      },
    });
    await recalculateInvoice(tx, invoiceId);
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "invoice.adjustments_updated",
    entityType: "Invoice",
    entityId: invoiceId,
  });
}

export async function recordPayment(actor: CurrentUser, invoiceId: string, input: RecordPaymentInput) {
  assertCan(actor.profile.role, "billing:record-payment");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.invoiceId !== invoiceId || existing.amountCents !== input.amountCents || existing.method !== input.method || existing.reference !== (input.reference || null)) throw new Error("Idempotency key already used for a different payment.");
      return existing;
    }
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found.");
    if (input.amountCents > invoice.totalCents - invoice.paidCents) throw new Error("Payment amount cannot exceed the outstanding balance.");
    const created = await tx.payment.create({
      data: { invoiceId, amountCents: input.amountCents, method: input.method, reference: input.reference || null, idempotencyKey: input.idempotencyKey, recordedById: actor.profile.id },
    });
    await recalculateInvoice(tx, invoiceId);
    await tx.auditLog.create({ data: { actorId: actor.profile.id, actorRole: actor.profile.role, action: "invoice.payment_recorded", entityType: "Invoice", entityId: invoiceId, metadata: { amountCents: input.amountCents, method: input.method } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordRefund(actor: CurrentUser, input: RecordRefundInput) {
  assertCan(actor.profile.role, "billing:refund");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.paymentId !== input.paymentId || existing.amountCents !== input.amountCents || existing.reason !== input.reason) throw new Error("Idempotency key already used for a different refund.");
      return existing;
    }
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { refunds: true } });
    if (!payment) throw new Error("Payment not found.");
    const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amountCents, 0);
    if (input.amountCents > maxRefundableCents(payment.amountCents, refunded)) throw new Error("Refund amount cannot exceed the payment's remaining refundable balance.");
    const created = await tx.refund.create({
      data: { paymentId: input.paymentId, amountCents: input.amountCents, reason: input.reason, idempotencyKey: input.idempotencyKey, recordedById: actor.profile.id },
    });
    await recalculateInvoice(tx, payment.invoiceId);
    await tx.auditLog.create({ data: { actorId: actor.profile.id, actorRole: actor.profile.role, action: "invoice.refund_recorded", entityType: "Invoice", entityId: payment.invoiceId, metadata: { paymentId: input.paymentId, amountCents: input.amountCents } } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getPaymentById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "billing:view");

  return prisma.payment.findUnique({
    where: { id },
    include: {
      recordedBy: { select: { fullName: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          totalCents: true,
          paidCents: true,
          patient: { select: { firstName: true, lastName: true, patientId: true } },
        },
      },
    },
  });
}

export async function getRevenueSummary(actor: CurrentUser, range: { from: Date; to: Date }) {
  assertCan(actor.profile.role, "billing:view-revenue");

  const [invoicesInRange, paymentsInRange, refundsInRange, outstandingInvoices, statusCounts] =
    await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalCents: true },
        _count: true,
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      prisma.payment.aggregate({
        _sum: { amountCents: true },
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      prisma.refund.aggregate({
        _sum: { amountCents: true },
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      prisma.invoice.aggregate({
        _sum: { totalCents: true, paidCents: true },
        where: { status: { in: ["UNPAID", "PARTIAL"] } },
      }),
      prisma.invoice.groupBy({ by: ["status"], _count: true }),
    ]);

  return {
    totalInvoicedCents: invoicesInRange._sum.totalCents ?? 0,
    invoiceCount: invoicesInRange._count,
    totalCollectedCents:
      (paymentsInRange._sum.amountCents ?? 0) - (refundsInRange._sum.amountCents ?? 0),
    totalRefundedCents: refundsInRange._sum.amountCents ?? 0,
    totalOutstandingCents:
      (outstandingInvoices._sum.totalCents ?? 0) - (outstandingInvoices._sum.paidCents ?? 0),
    countByStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
  };
}
