import type { InvoiceStatus } from "@prisma/client";

export function formatInvoiceNumber(sequenceNumber: number): string {
  return `INV-${String(sequenceNumber).padStart(6, "0")}`;
}

/** A line's billed amount is always quantity × unit price — never accepted from the client. */
export function computeItemAmount(quantity: number, unitPriceCents: number): number {
  return quantity * unitPriceCents;
}

export type InvoiceTotalsInput = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  adjustmentCents: number;
};

/** The server-authoritative total. Floored at 0 so a discount/adjustment can never make an
 * invoice "owe" a negative amount. */
export function computeInvoiceTotal(input: InvoiceTotalsInput): number {
  const raw = input.subtotalCents - input.discountCents + input.taxCents + input.adjustmentCents;
  return Math.max(0, raw);
}

export function computeBalance(totalCents: number, paidCents: number): number {
  return totalCents - paidCents;
}

/** Status is derived purely from the numbers — never stored as an independent source of truth
 * the way a hand-set flag could drift from reality. `hasRefund` distinguishes "never paid"
 * (UNPAID) from "was paid, then given back" (REFUNDED) once the net paid amount returns to 0. */
export function computeInvoiceStatus(
  totalCents: number,
  paidCents: number,
  hasRefund: boolean,
): InvoiceStatus {
  if (paidCents <= 0) return hasRefund ? "REFUNDED" : "UNPAID";
  if (paidCents < totalCents) return "PARTIAL";
  return "PAID";
}

/** Items/discount/tax/adjustment are frozen the instant a first payment exists — real money has
 * already changed hands against those figures. */
export function isInvoiceEditable(paymentCount: number): boolean {
  return paymentCount === 0;
}

export function canRecordPayment(balanceCents: number): boolean {
  return balanceCents > 0;
}

/** A refund can never exceed what's left un-refunded on the specific payment it targets. */
export function maxRefundableCents(paymentAmountCents: number, alreadyRefundedCents: number): number {
  return Math.max(0, paymentAmountCents - alreadyRefundedCents);
}

/** The patient-portal access rule for invoices/receipts: ownership only — an invoice has no
 * draft/issued concept the way a prescription or lab order does, so there's no status gate. */
export function canPatientAccessInvoice(isOwnRecord: boolean): boolean {
  return isOwnRecord;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
