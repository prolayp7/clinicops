import { describe, expect, it } from "vitest";
import {
  canIssuePrescription,
  canPatientAccessPrescription,
  formatPrescriptionNumber,
  isPrescriptionEditable,
  MEAL_INSTRUCTION_LABELS,
} from "@/lib/prescriptions";

describe("formatPrescriptionNumber", () => {
  it("pads the sequence number to 6 digits with an RX- prefix", () => {
    expect(formatPrescriptionNumber(1)).toBe("RX-000001");
    expect(formatPrescriptionNumber(42)).toBe("RX-000042");
    expect(formatPrescriptionNumber(123456)).toBe("RX-123456");
  });
});

describe("isPrescriptionEditable", () => {
  it("is editable only while DRAFT", () => {
    expect(isPrescriptionEditable("DRAFT")).toBe(true);
    expect(isPrescriptionEditable("ISSUED")).toBe(false);
  });
});

describe("canIssuePrescription", () => {
  it("requires DRAFT status and at least one item", () => {
    expect(canIssuePrescription("DRAFT", 1)).toBe(true);
    expect(canIssuePrescription("DRAFT", 0)).toBe(false);
    expect(canIssuePrescription("ISSUED", 1)).toBe(false);
    expect(canIssuePrescription("ISSUED", 0)).toBe(false);
  });
});

describe("canPatientAccessPrescription", () => {
  it("requires both ownership and ISSUED status", () => {
    expect(canPatientAccessPrescription("ISSUED", true)).toBe(true);
    expect(canPatientAccessPrescription("ISSUED", false)).toBe(false);
    expect(canPatientAccessPrescription("DRAFT", true)).toBe(false);
  });
});

describe("MEAL_INSTRUCTION_LABELS", () => {
  it("has a human-readable label for every meal instruction value", () => {
    expect(MEAL_INSTRUCTION_LABELS.BEFORE_MEAL).toBe("Before meal");
    expect(MEAL_INSTRUCTION_LABELS.AFTER_MEAL).toBe("After meal");
    expect(MEAL_INSTRUCTION_LABELS.WITH_MEAL).toBe("With meal");
    expect(MEAL_INSTRUCTION_LABELS.EMPTY_STOMACH).toBe("Empty stomach");
    expect(MEAL_INSTRUCTION_LABELS.NOT_APPLICABLE).toBe("Not applicable");
  });
});
