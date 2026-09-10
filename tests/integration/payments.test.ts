import { beforeEach, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/auth/session";
vi.mock("server-only", () => ({}));
const tx = vi.hoisted(() => ({
  payment: { findUnique: vi.fn(), create: vi.fn() },
  refund: { findUnique: vi.fn(), create: vi.fn() },
  invoice: { findUnique: vi.fn() },
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/prisma", () => ({ prisma: { $transaction: transaction } }));
import { recordPayment, recordRefund } from "@/server/services/invoices-service";
const actor = { profile: { id: "staff", role: "ACCOUNTANT" } } as CurrentUser;
beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation((callback) => callback(tx));
});
it("checks current balance inside a serializable transaction", async () => {
  tx.invoice.findUnique.mockResolvedValue({ totalCents: 100, paidCents: 100 });
  await expect(recordPayment(actor, "invoice", { amountCents: 1, method: "CASH", idempotencyKey: "key", reference: "" })).rejects.toThrow("outstanding balance");
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  expect(tx.payment.create).not.toHaveBeenCalled();
});
it("rejects a retry key belonging to another invoice", async () => {
  tx.payment.findUnique.mockResolvedValue({ invoiceId: "other", amountCents: 1, method: "CASH", reference: null });
  await expect(recordPayment(actor, "invoice", { amountCents: 1, method: "CASH", idempotencyKey: "key", reference: "" })).rejects.toThrow("different payment");
});
it("checks remaining refundable balance inside the transaction", async () => {
  tx.payment.findUnique.mockResolvedValue({ amountCents: 100, refunds: [{ amountCents: 100 }] });
  await expect(recordRefund(actor, { paymentId: "payment", amountCents: 1, reason: "Synthetic correction", idempotencyKey: "key" })).rejects.toThrow("refundable balance");
  expect(tx.refund.create).not.toHaveBeenCalled();
});
it("denies refunds to reception before opening a transaction", async () => {
  await expect(recordRefund({ profile: { role: "RECEPTIONIST" } } as CurrentUser, { paymentId: "payment", amountCents: 1, reason: "Synthetic correction", idempotencyKey: "key" })).rejects.toThrow();
  expect(transaction).not.toHaveBeenCalled();
});
