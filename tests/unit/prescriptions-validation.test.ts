import { describe, expect, it } from "vitest";
import { medicineSchema } from "@/lib/validation/medicines";
import { createPrescriptionSchema, prescriptionItemSchema } from "@/lib/validation/prescriptions";

describe("medicineSchema", () => {
  it("accepts a valid medicine", () => {
    const result = medicineSchema.safeParse({ name: "Amoxicillin", strength: "500mg", form: "Capsule" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing strength", () => {
    expect(medicineSchema.safeParse({ name: "Amoxicillin", strength: "", form: "Capsule" }).success).toBe(
      false,
    );
  });

  it("rejects a too-short name", () => {
    expect(medicineSchema.safeParse({ name: "A", strength: "500mg", form: "Capsule" }).success).toBe(
      false,
    );
  });
});

describe("createPrescriptionSchema", () => {
  const valid = {
    patientId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    doctorId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3b",
  };

  it("accepts patient + doctor with no consultation link or notes", () => {
    expect(createPrescriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional consultationId and notes", () => {
    const result = createPrescriptionSchema.safeParse({
      ...valid,
      consultationId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3c",
      notes: "Take with food.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid patient id", () => {
    expect(createPrescriptionSchema.safeParse({ ...valid, patientId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("prescriptionItemSchema", () => {
  const valid = {
    medicineId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    dosage: "1 tablet",
    frequency: "Twice daily",
    route: "Oral",
    duration: "7 days",
    mealInstruction: "AFTER_MEAL" as const,
  };

  it("accepts a fully valid item", () => {
    expect(prescriptionItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing dosage", () => {
    expect(prescriptionItemSchema.safeParse({ ...valid, dosage: "" }).success).toBe(false);
  });

  it("rejects an unknown meal instruction", () => {
    expect(
      prescriptionItemSchema.safeParse({ ...valid, mealInstruction: "AT_BEDTIME" }).success,
    ).toBe(false);
  });

  it("accepts optional directions", () => {
    const result = prescriptionItemSchema.safeParse({ ...valid, directions: "Avoid grapefruit." });
    expect(result.success).toBe(true);
  });
});
