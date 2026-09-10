import { describe, expect, it } from "vitest";
import { reportDateRangeSchema } from "@/lib/validation/reports";

describe("reportDateRangeSchema", () => {
  it("accepts a valid from/to range", () => {
    expect(reportDateRangeSchema.safeParse({ from: "2026-01-01", to: "2026-01-31" }).success).toBe(true);
  });

  it("accepts the same start and end date", () => {
    expect(reportDateRangeSchema.safeParse({ from: "2026-01-01", to: "2026-01-01" }).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(reportDateRangeSchema.safeParse({ from: "2026-02-01", to: "2026-01-01" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(reportDateRangeSchema.safeParse({ from: "not-a-date", to: "2026-01-01" }).success).toBe(false);
  });
});
