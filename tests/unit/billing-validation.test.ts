import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
  recordRefundSchema,
  updateInvoiceAdjustmentsSchema,
} from "@/lib/validation/billing";

const uuid = "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a";

describe("createInvoiceSchema", () => {
  it("accepts a patient with no due date or notes", () => {
    expect(createInvoiceSchema.safeParse({ patientId: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid patient id", () => {
    expect(createInvoiceSchema.safeParse({ patientId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("invoiceItemSchema", () => {
  const valid = {
    category: "CONSULTATION" as const,
    description: "Consultation with Dr. Rivera",
    quantity: 1,
    unitPriceCents: 10000,
  };

  it("accepts a valid manual charge", () => {
    expect(invoiceItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing description", () => {
    expect(invoiceItemSchema.safeParse({ ...valid, description: "" }).success).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    expect(invoiceItemSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(invoiceItemSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    expect(invoiceItemSchema.safeParse({ ...valid, unitPriceCents: -100 }).success).toBe(false);
  });

  it("accepts an optional consultation or lab order link", () => {
    expect(invoiceItemSchema.safeParse({ ...valid, consultationId: uuid }).success).toBe(true);
    expect(
      invoiceItemSchema.safeParse({ ...valid, category: "LAB", labOrderId: uuid }).success,
    ).toBe(true);
  });
});

describe("updateInvoiceAdjustmentsSchema", () => {
  it("accepts a positive discount/tax and a negative adjustment", () => {
    const result = updateInvoiceAdjustmentsSchema.safeParse({
      discountCents: 500,
      taxCents: 200,
      adjustmentCents: -300,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative discount or tax", () => {
    expect(
      updateInvoiceAdjustmentsSchema.safeParse({ discountCents: -1, taxCents: 0, adjustmentCents: 0 })
        .success,
    ).toBe(false);
    expect(
      updateInvoiceAdjustmentsSchema.safeParse({ discountCents: 0, taxCents: -1, adjustmentCents: 0 })
        .success,
    ).toBe(false);
  });
});

describe("recordPaymentSchema", () => {
  const valid = { amountCents: 5000, method: "CASH" as const, idempotencyKey: uuid };

  it("accepts a valid payment", () => {
    expect(recordPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(recordPaymentSchema.safeParse({ ...valid, amountCents: 0 }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...valid, amountCents: -100 }).success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    expect(recordPaymentSchema.safeParse({ ...valid, method: "CRYPTO" }).success).toBe(false);
  });

  it("requires an idempotency key", () => {
    expect(recordPaymentSchema.safeParse({ ...valid, idempotencyKey: "" }).success).toBe(false);
  });
});

describe("recordRefundSchema", () => {
  const valid = {
    paymentId: uuid,
    amountCents: 1000,
    reason: "Patient was overcharged",
    idempotencyKey: uuid,
  };

  it("accepts a valid refund", () => {
    expect(recordRefundSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing or too-short reason", () => {
    expect(recordRefundSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
    expect(recordRefundSchema.safeParse({ ...valid, reason: "no" }).success).toBe(false);
  });

  it("rejects a zero or negative amount", () => {
    expect(recordRefundSchema.safeParse({ ...valid, amountCents: 0 }).success).toBe(false);
  });
});
