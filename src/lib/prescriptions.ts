import type { PrescriptionStatus, MealInstruction } from "@prisma/client";

export function formatPrescriptionNumber(sequenceNumber: number): string {
  return `RX-${String(sequenceNumber).padStart(6, "0")}`;
}

/** Only a DRAFT prescription can have its items or notes changed. */
export function isPrescriptionEditable(status: PrescriptionStatus): boolean {
  return status === "DRAFT";
}

/** Issuing freezes the record, so it must have at least one medicine line first. */
export function canIssuePrescription(status: PrescriptionStatus, itemCount: number): boolean {
  return status === "DRAFT" && itemCount > 0;
}

/** The patient-portal access rule: a prescription is "released" to its own patient once issued —
 * mirrors `canPatientAccessLabOrder` in lib/laboratory.ts. */
export function canPatientAccessPrescription(status: PrescriptionStatus, isOwnRecord: boolean): boolean {
  return isOwnRecord && status === "ISSUED";
}

export const MEAL_INSTRUCTION_LABELS: Record<MealInstruction, string> = {
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  WITH_MEAL: "With meal",
  EMPTY_STOMACH: "Empty stomach",
  NOT_APPLICABLE: "Not applicable",
};
