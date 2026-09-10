import { describe, expect, it } from "vitest";
import { labTestSchema } from "@/lib/validation/lab-tests";
import {
  changeLabOrderStatusSchema,
  createLabOrderSchema,
  labResultItemSchema,
  saveResultsSchema,
} from "@/lib/validation/lab-orders";

describe("labTestSchema", () => {
  it("accepts a valid lab test", () => {
    const result = labTestSchema.safeParse({
      name: "Complete Blood Count",
      category: "Hematology",
      priceCents: 2500,
      unit: "cells/mcL",
      referenceRangeText: "4,500-11,000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = labTestSchema.safeParse({
      name: "Complete Blood Count",
      category: "Hematology",
      priceCents: -100,
      unit: "cells/mcL",
      referenceRangeText: "4,500-11,000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing reference range", () => {
    const result = labTestSchema.safeParse({
      name: "Complete Blood Count",
      category: "Hematology",
      priceCents: 2500,
      unit: "cells/mcL",
      referenceRangeText: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createLabOrderSchema", () => {
  const valid = {
    patientId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    testIds: ["8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3b"],
  };

  it("accepts a patient with at least one test", () => {
    expect(createLabOrderSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an order with no tests selected", () => {
    expect(createLabOrderSchema.safeParse({ ...valid, testIds: [] }).success).toBe(false);
  });

  it("accepts an optional consultation link", () => {
    const result = createLabOrderSchema.safeParse({
      ...valid,
      consultationId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3c",
    });
    expect(result.success).toBe(true);
  });
});

describe("changeLabOrderStatusSchema", () => {
  it("accepts a valid forward transition without a reason", () => {
    const result = changeLabOrderStatusSchema.safeParse({
      fromStatus: "ORDERED",
      toStatus: "SAMPLE_COLLECTED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid transition even with a reason", () => {
    const result = changeLabOrderStatusSchema.safeParse({
      fromStatus: "ORDERED",
      toStatus: "COMPLETED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects cancellation without a reason", () => {
    const result = changeLabOrderStatusSchema.safeParse({
      fromStatus: "ORDERED",
      toStatus: "CANCELLED",
    });
    expect(result.success).toBe(false);
  });

  it("accepts cancellation with a reason", () => {
    const result = changeLabOrderStatusSchema.safeParse({
      fromStatus: "ORDERED",
      toStatus: "CANCELLED",
      reason: "Patient declined the test",
    });
    expect(result.success).toBe(true);
  });
});

describe("labResultItemSchema / saveResultsSchema", () => {
  const validItem = {
    itemId: "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a",
    resultValue: "5.2",
    unit: "mg/dL",
    referenceRange: "3.5-5.5",
    abnormalFlag: "NORMAL" as const,
  };

  it("accepts a valid result item", () => {
    expect(labResultItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("accepts a blank result value (not yet entered)", () => {
    expect(labResultItemSchema.safeParse({ ...validItem, resultValue: "" }).success).toBe(true);
  });

  it("rejects a missing unit or reference range", () => {
    expect(labResultItemSchema.safeParse({ ...validItem, unit: "" }).success).toBe(false);
    expect(labResultItemSchema.safeParse({ ...validItem, referenceRange: "" }).success).toBe(false);
  });

  it("rejects an unknown abnormal flag", () => {
    expect(labResultItemSchema.safeParse({ ...validItem, abnormalFlag: "SEVERE" }).success).toBe(false);
  });

  it("requires at least one item in the batch save", () => {
    expect(saveResultsSchema.safeParse({ items: [] }).success).toBe(false);
    expect(saveResultsSchema.safeParse({ items: [validItem] }).success).toBe(true);
  });
});
