import { z } from "zod";
import { InvoiceItemCategory, PaymentMethod } from "@prisma/client";

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  dueDate: z.string().date().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const invoiceItemSchema = z.object({
  category: z.nativeEnum(InvoiceItemCategory),
  description: z.string().trim().min(1, "Enter a description").max(300),
  quantity: z.coerce.number().int().min(1).max(9999),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_00),
  consultationId: z.string().uuid().optional().or(z.literal("")),
  labOrderId: z.string().uuid().optional().or(z.literal("")),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const updateInvoiceAdjustmentsSchema = z.object({
  discountCents: z.coerce.number().int().min(0).max(100_000_00),
  taxCents: z.coerce.number().int().min(0).max(100_000_00),
  adjustmentCents: z.coerce.number().int().min(-100_000_00).max(100_000_00),
});
export type UpdateInvoiceAdjustmentsInput = z.infer<typeof updateInvoiceAdjustmentsSchema>;

export const recordPaymentSchema = z.object({
  amountCents: z.coerce.number().int().min(1, "Enter an amount greater than zero").max(100_000_00),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  idempotencyKey: z.string().uuid(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const recordRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amountCents: z.coerce.number().int().min(1, "Enter an amount greater than zero").max(100_000_00),
  reason: z.string().trim().min(5, "Explain the reason for this refund.").max(300),
  idempotencyKey: z.string().uuid(),
});
export type RecordRefundInput = z.infer<typeof recordRefundSchema>;
