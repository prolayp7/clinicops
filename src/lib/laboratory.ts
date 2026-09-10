import type { AbnormalFlag, LabOrderStatus } from "@prisma/client";

export function formatLabOrderNumber(sequenceNumber: number): string {
  return `LAB-${String(sequenceNumber).padStart(6, "0")}`;
}

/** Mirrors the Appointment/Consultation status-graph pattern: a small explicit map plus a
 * lookup function, kept dependency-free so it's trivially unit-testable. */
export const VALID_TRANSITIONS: Record<LabOrderStatus, readonly LabOrderStatus[]> = {
  ORDERED: ["SAMPLE_COLLECTED", "CANCELLED"],
  SAMPLE_COLLECTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REVIEWED"],
  REVIEWED: [],
  CANCELLED: [],
};

export function isValidTransition(from: LabOrderStatus, to: LabOrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export const TERMINAL_STATUSES: readonly LabOrderStatus[] = ["REVIEWED", "CANCELLED"];

export function isTerminalStatus(status: LabOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Only cancellation requires a reason — matches the Appointment convention. */
export function isReasonRequired(toStatus: LabOrderStatus): boolean {
  return toStatus === "CANCELLED";
}

/** An order can move to COMPLETED only once every ordered test has a result recorded. */
export function canCompleteLabOrder(items: readonly { resultValue: string | null }[]): boolean {
  return items.length > 0 && items.every((item) => Boolean(item.resultValue?.trim()));
}

/** The patient-portal access rule: a lab report is visible to its patient only once the order has
 * been reviewed (== "released" in the product spec) and only to that patient's own record. There
 * is no patient login yet (see StaffProfile's doc comment) — this predicate is the enforcement
 * point the eventual patient-portal phase will call. */
export function canPatientAccessLabOrder(status: LabOrderStatus, isOwnRecord: boolean): boolean {
  return isOwnRecord && status === "REVIEWED";
}

export const ABNORMAL_FLAG_LABELS: Record<AbnormalFlag, string> = {
  NORMAL: "Normal",
  LOW: "Low",
  HIGH: "High",
  CRITICAL: "Critical",
};
