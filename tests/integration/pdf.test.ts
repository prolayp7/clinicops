// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { ClinicSetting, Sex } from "@prisma/client";
vi.mock("server-only", () => ({}));
import { renderReceiptPdf } from "@/server/pdf/receipt-pdf";
import { renderLabReportPdf } from "@/server/pdf/lab-report-pdf";

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

it("renders a synthetic reviewed laboratory report into a complete PDF", async () => {
  const clinic = { name: "Fictional Test Clinic", addressLine1: "100 Test Street", addressLine2: null, city: "Test City", state: "NY", postalCode: "10001", phone: "2025550100", email: "clinic@example.test" } as ClinicSetting;
  const result = await renderLabReportPdf({
    orderNumber: "LAB-TEST-000001",
    createdAt: new Date("2026-10-01T12:00:00Z"),
    reviewedAt: new Date("2026-10-02T12:00:00Z"),
    patient: {
      firstName: "Fictional",
      lastName: "Patient",
      patientId: "PT-TEST-000001",
      dateOfBirth: new Date("1990-06-15T00:00:00Z"),
      sex: "UNKNOWN" as Sex,
    },
    orderedBy: { fullName: "Test Doctor" },
    reviewedBy: { fullName: "Test Reviewer" },
    items: [{
      resultValue: "5.1",
      unit: "mg/dL",
      referenceRange: "3.0-6.0",
      abnormalFlag: "NORMAL",
      labTest: { name: "Synthetic Chemistry Test", category: "Chemistry" },
    }],
  }, clinic);

  expect(result.subarray(0, 5).toString()).toBe("%PDF-");
  expect(result.toString("latin1")).toContain("%%EOF");
  expect(result.length).toBeGreaterThan(1000);
});
