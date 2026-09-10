import { describe, expect, it } from "vitest";
import {
  canPatientAccessInvoice,
  canRecordPayment,
  computeBalance,
  computeInvoiceStatus,
  computeInvoiceTotal,
  computeItemAmount,
  formatInvoiceNumber,
  isInvoiceEditable,
  maxRefundableCents,
} from "@/lib/billing";

describe("formatInvoiceNumber", () => {
  it("pads the sequence number to 6 digits with an INV- prefix", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-000001");
    expect(formatInvoiceNumber(42)).toBe("INV-000042");
  });
});

describe("computeItemAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(computeItemAmount(1, 5000)).toBe(5000);
    expect(computeItemAmount(3, 2500)).toBe(7500);
    expect(computeItemAmount(0, 5000)).toBe(0);
  });
});

describe("computeInvoiceTotal", () => {
  it("applies discount and tax and adjustment to the subtotal", () => {
    expect(
      computeInvoiceTotal({ subtotalCents: 10000, discountCents: 1000, taxCents: 500, adjustmentCents: 0 }),
    ).toBe(9500);
  });

  it("allows a negative adjustment to reduce the total", () => {
    expect(
      computeInvoiceTotal({ subtotalCents: 10000, discountCents: 0, taxCents: 0, adjustmentCents: -2000 }),
    ).toBe(8000);
  });

  it("allows a positive adjustment to increase the total", () => {
    expect(
      computeInvoiceTotal({ subtotalCents: 10000, discountCents: 0, taxCents: 0, adjustmentCents: 1500 }),
    ).toBe(11500);
  });

  it("floors the total at 0 — a discount can never make an invoice owe a negative amount", () => {
    expect(
      computeInvoiceTotal({ subtotalCents: 1000, discountCents: 5000, taxCents: 0, adjustmentCents: 0 }),
    ).toBe(0);
  });
});

describe("computeBalance", () => {
  it("is total minus paid", () => {
    expect(computeBalance(10000, 4000)).toBe(6000);
    expect(computeBalance(10000, 10000)).toBe(0);
  });
});

describe("computeInvoiceStatus", () => {
  it("is UNPAID when nothing has been paid and there's no refund history", () => {
    expect(computeInvoiceStatus(10000, 0, false)).toBe("UNPAID");
  });

  it("is REFUNDED when the net paid amount returns to 0 after a refund", () => {
    expect(computeInvoiceStatus(10000, 0, true)).toBe("REFUNDED");
  });

  it("is PARTIAL when paid is between 0 and the total", () => {
    expect(computeInvoiceStatus(10000, 4000, false)).toBe("PARTIAL");
  });

  it("is PAID when paid meets or exceeds the total", () => {
    expect(computeInvoiceStatus(10000, 10000, false)).toBe("PAID");
    expect(computeInvoiceStatus(10000, 12000, false)).toBe("PAID");
  });
});

describe("isInvoiceEditable", () => {
  it("is editable only before any payment exists", () => {
    expect(isInvoiceEditable(0)).toBe(true);
    expect(isInvoiceEditable(1)).toBe(false);
  });
});

describe("canRecordPayment", () => {
  it("requires a positive balance", () => {
    expect(canRecordPayment(100)).toBe(true);
    expect(canRecordPayment(0)).toBe(false);
    expect(canRecordPayment(-100)).toBe(false);
  });
});

describe("maxRefundableCents", () => {
  it("is the payment amount minus what's already been refunded", () => {
    expect(maxRefundableCents(5000, 0)).toBe(5000);
    expect(maxRefundableCents(5000, 2000)).toBe(3000);
  });

  it("never goes negative even if over-refunded somehow", () => {
    expect(maxRefundableCents(5000, 6000)).toBe(0);
  });
});

describe("canPatientAccessInvoice", () => {
  it("is ownership-only — invoices have no draft/release gate", () => {
    expect(canPatientAccessInvoice(true)).toBe(true);
    expect(canPatientAccessInvoice(false)).toBe(false);
  });
});
