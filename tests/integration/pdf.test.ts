// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { ClinicSetting } from "@prisma/client";
vi.mock("server-only", () => ({}));
import { renderReceiptPdf } from "@/server/pdf/receipt-pdf";

it("renders a synthetic receipt into a complete PDF", async () => {
  const clinic = { name: "Fictional Test Clinic", addressLine1: "100 Test Street", addressLine2: null, city: "Test City", state: "NY", postalCode: "10001", phone: "2025550100", email: "clinic@example.test" } as ClinicSetting;
  const result = await renderReceiptPdf({
    amountCents: 5000, method: "CASH", reference: null, createdAt: new Date("2026-01-01T12:00:00Z"),
    recordedBy: { fullName: "Test Staff" },
    invoice: { invoiceNumber: "INV-TEST", totalCents: 10000, paidCents: 5000, patient: { firstName: "Fictional", lastName: "Patient", patientId: "PAT-TEST" } },
  }, clinic);
  expect(result.subarray(0, 5).toString()).toBe("%PDF-");
  expect(result.toString("latin1")).toContain("%%EOF");
  expect(result.length).toBeGreaterThan(1000);
});
