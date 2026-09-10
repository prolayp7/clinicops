import { describe, expect, it } from "vitest";
import { LabOrderStatus } from "@prisma/client";
import {
  ABNORMAL_FLAG_LABELS,
  TERMINAL_STATUSES,
  VALID_TRANSITIONS,
  canCompleteLabOrder,
  canPatientAccessLabOrder,
  formatLabOrderNumber,
  isReasonRequired,
  isTerminalStatus,
  isValidTransition,
} from "@/lib/laboratory";

describe("formatLabOrderNumber", () => {
  it("pads the sequence number to 6 digits with a LAB- prefix", () => {
    expect(formatLabOrderNumber(1)).toBe("LAB-000001");
    expect(formatLabOrderNumber(42)).toBe("LAB-000042");
  });
});

describe("lab order status transition graph", () => {
  it("allows the normal manual-sample workflow end to end", () => {
    const path: LabOrderStatus[] = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "REVIEWED"];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("rejects skipping ahead in the flow", () => {
    expect(isValidTransition("ORDERED", "PROCESSING")).toBe(false);
    expect(isValidTransition("ORDERED", "COMPLETED")).toBe(false);
    expect(isValidTransition("SAMPLE_COLLECTED", "COMPLETED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isValidTransition("PROCESSING", "SAMPLE_COLLECTED")).toBe(false);
    expect(isValidTransition("REVIEWED", "COMPLETED")).toBe(false);
  });

  it("allows cancelling any time before results are completed", () => {
    for (const status of Object.keys(VALID_TRANSITIONS) as LabOrderStatus[]) {
      if (TERMINAL_STATUSES.includes(status) || status === "COMPLETED") continue;
      expect(isValidTransition(status, "CANCELLED")).toBe(true);
    }
  });

  it("does not allow cancelling once results are completed — only reviewing them", () => {
    expect(isValidTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(isValidTransition("COMPLETED", "REVIEWED")).toBe(true);
  });

  it("has no outgoing transitions from any terminal status", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(VALID_TRANSITIONS[status]).toHaveLength(0);
    }
  });

  it("flags exactly the terminal statuses", () => {
    expect(isTerminalStatus("REVIEWED")).toBe(true);
    expect(isTerminalStatus("CANCELLED")).toBe(true);
    expect(isTerminalStatus("PROCESSING")).toBe(false);
  });

  it("requires a reason only for cancellation", () => {
    expect(isReasonRequired("CANCELLED")).toBe(true);
    expect(isReasonRequired("REVIEWED")).toBe(false);
    expect(isReasonRequired("COMPLETED")).toBe(false);
  });
});

describe("canCompleteLabOrder", () => {
  it("requires at least one item and every item to have a result", () => {
    expect(canCompleteLabOrder([])).toBe(false);
    expect(canCompleteLabOrder([{ resultValue: null }])).toBe(false);
    expect(canCompleteLabOrder([{ resultValue: "" }])).toBe(false);
    expect(canCompleteLabOrder([{ resultValue: "  " }])).toBe(false);
    expect(canCompleteLabOrder([{ resultValue: "5.2" }])).toBe(true);
  });

  it("rejects when only some items have results", () => {
    expect(canCompleteLabOrder([{ resultValue: "5.2" }, { resultValue: null }])).toBe(false);
  });

  it("accepts when every item has a result", () => {
    expect(canCompleteLabOrder([{ resultValue: "5.2" }, { resultValue: "Negative" }])).toBe(true);
  });
});

describe("canPatientAccessLabOrder", () => {
  it("requires both ownership and REVIEWED status", () => {
    expect(canPatientAccessLabOrder("REVIEWED", true)).toBe(true);
    expect(canPatientAccessLabOrder("REVIEWED", false)).toBe(false);
    expect(canPatientAccessLabOrder("COMPLETED", true)).toBe(false);
    expect(canPatientAccessLabOrder("ORDERED", true)).toBe(false);
    expect(canPatientAccessLabOrder("CANCELLED", true)).toBe(false);
  });
});

describe("ABNORMAL_FLAG_LABELS", () => {
  it("has a human-readable label for every flag value", () => {
    expect(ABNORMAL_FLAG_LABELS.NORMAL).toBe("Normal");
    expect(ABNORMAL_FLAG_LABELS.LOW).toBe("Low");
    expect(ABNORMAL_FLAG_LABELS.HIGH).toBe("High");
    expect(ABNORMAL_FLAG_LABELS.CRITICAL).toBe("Critical");
  });
});
