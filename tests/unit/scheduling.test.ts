import { describe, expect, it } from "vitest";
import {
  dateRangesOverlap,
  dateToTimeString,
  timeRangesOverlap,
  timeStringToDate,
} from "@/lib/scheduling";

describe("timeStringToDate / dateToTimeString", () => {
  it("round-trips HH:mm through the epoch-anchored Date representation", () => {
    for (const hhmm of ["00:00", "09:30", "13:05", "23:59"]) {
      expect(dateToTimeString(timeStringToDate(hhmm))).toBe(hhmm);
    }
  });
});

describe("timeRangesOverlap", () => {
  it("flags overlapping ranges", () => {
    expect(timeRangesOverlap({ startTime: "09:00", endTime: "12:00" }, { startTime: "11:00", endTime: "13:00" })).toBe(true);
  });

  it("flags one range fully containing another", () => {
    expect(timeRangesOverlap({ startTime: "09:00", endTime: "17:00" }, { startTime: "12:00", endTime: "13:00" })).toBe(true);
  });

  it("does not flag back-to-back adjacent ranges", () => {
    expect(timeRangesOverlap({ startTime: "09:00", endTime: "12:00" }, { startTime: "12:00", endTime: "14:00" })).toBe(false);
  });

  it("does not flag genuinely separate ranges", () => {
    expect(timeRangesOverlap({ startTime: "09:00", endTime: "10:00" }, { startTime: "14:00", endTime: "15:00" })).toBe(false);
  });
});

describe("dateRangesOverlap", () => {
  it("flags overlapping date ranges", () => {
    expect(dateRangesOverlap({ startDate: "2026-01-05", endDate: "2026-01-10" }, { startDate: "2026-01-08", endDate: "2026-01-12" })).toBe(true);
  });

  it("flags identical single-day ranges", () => {
    expect(dateRangesOverlap({ startDate: "2026-01-05", endDate: "2026-01-05" }, { startDate: "2026-01-05", endDate: "2026-01-05" })).toBe(true);
  });

  it("does not flag separate date ranges", () => {
    expect(dateRangesOverlap({ startDate: "2026-01-01", endDate: "2026-01-05" }, { startDate: "2026-01-10", endDate: "2026-01-15" })).toBe(false);
  });
});
