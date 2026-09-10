import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "@prisma/client";
import {
  addMinutesToTimeString,
  initialStatusForSource,
  isDuringLeave,
  isReasonRequired,
  isTerminalStatus,
  isValidTransition,
  isWithinAvailability,
  SLOT_BLOCKING_STATUSES,
  TERMINAL_STATUSES,
  VALID_TRANSITIONS,
  weekdayFromDateString,
} from "@/lib/appointments";

describe("appointment status transition graph", () => {
  it("allows the normal staff-booked day-of flow end to end", () => {
    const path: AppointmentStatus[] = [
      "SCHEDULED",
      "CHECKED_IN",
      "WAITING",
      "IN_CONSULTATION",
      "COMPLETED",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows the online-request flow through confirmation", () => {
    expect(isValidTransition("REQUESTED", "CONFIRMED")).toBe(true);
    expect(isValidTransition("CONFIRMED", "CHECKED_IN")).toBe(true);
  });

  it("rejects skipping ahead in the flow", () => {
    expect(isValidTransition("SCHEDULED", "IN_CONSULTATION")).toBe(false);
    expect(isValidTransition("SCHEDULED", "COMPLETED")).toBe(false);
    expect(isValidTransition("REQUESTED", "CHECKED_IN")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isValidTransition("WAITING", "CHECKED_IN")).toBe(false);
    expect(isValidTransition("COMPLETED", "IN_CONSULTATION")).toBe(false);
  });

  it("allows cancelling any time before the visit starts", () => {
    for (const status of Object.keys(VALID_TRANSITIONS) as AppointmentStatus[]) {
      if (TERMINAL_STATUSES.includes(status) || status === "IN_CONSULTATION") continue;
      expect(isValidTransition(status, "CANCELLED")).toBe(true);
    }
  });

  it("does not allow cancelling once the consultation has started — only completing it", () => {
    expect(isValidTransition("IN_CONSULTATION", "CANCELLED")).toBe(false);
    expect(isValidTransition("IN_CONSULTATION", "COMPLETED")).toBe(true);
  });

  it("has no outgoing transitions from any terminal status", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(VALID_TRANSITIONS[status]).toHaveLength(0);
    }
  });

  it("flags exactly the terminal statuses", () => {
    expect(isTerminalStatus("COMPLETED")).toBe(true);
    expect(isTerminalStatus("CANCELLED")).toBe(true);
    expect(isTerminalStatus("NO_SHOW")).toBe(true);
    expect(isTerminalStatus("WAITING")).toBe(false);
  });

  it("requires a reason only for cancellation and no-show", () => {
    expect(isReasonRequired("CANCELLED")).toBe(true);
    expect(isReasonRequired("NO_SHOW")).toBe(true);
    expect(isReasonRequired("CONFIRMED")).toBe(false);
    expect(isReasonRequired("COMPLETED")).toBe(false);
  });
});

describe("initialStatusForSource", () => {
  it("starts online requests as REQUESTED", () => {
    expect(initialStatusForSource("ONLINE_REQUEST")).toBe("REQUESTED");
  });

  it("starts staff-booked and walk-in visits as SCHEDULED", () => {
    expect(initialStatusForSource("STAFF_BOOKED")).toBe("SCHEDULED");
    expect(initialStatusForSource("WALK_IN")).toBe("SCHEDULED");
  });
});

describe("SLOT_BLOCKING_STATUSES", () => {
  it("excludes only the statuses that free up a slot", () => {
    expect(SLOT_BLOCKING_STATUSES).not.toContain("CANCELLED");
    expect(SLOT_BLOCKING_STATUSES).not.toContain("NO_SHOW");
    expect(SLOT_BLOCKING_STATUSES).toContain("SCHEDULED");
    expect(SLOT_BLOCKING_STATUSES).toContain("COMPLETED");
  });
});

describe("weekdayFromDateString", () => {
  it("resolves a known date to the correct weekday", () => {
    // 2026-09-10 is a Thursday.
    expect(weekdayFromDateString("2026-09-10")).toBe("THURSDAY");
    // 2026-09-14 is a Monday.
    expect(weekdayFromDateString("2026-09-14")).toBe("MONDAY");
  });
});

describe("addMinutesToTimeString", () => {
  it("adds minutes within the same day", () => {
    expect(addMinutesToTimeString("09:00", 30)).toBe("09:30");
    expect(addMinutesToTimeString("09:45", 30)).toBe("10:15");
  });

  it("wraps past midnight", () => {
    expect(addMinutesToTimeString("23:45", 30)).toBe("00:15");
  });
});

describe("isWithinAvailability", () => {
  const blocks = [{ weekday: "MONDAY" as const, startTime: "09:00", endTime: "12:00" }];

  it("accepts a slot fully inside a block", () => {
    expect(isWithinAvailability("MONDAY", "09:00", "09:30", blocks)).toBe(true);
  });

  it("rejects a slot on a day with no block", () => {
    expect(isWithinAvailability("TUESDAY", "09:00", "09:30", blocks)).toBe(false);
  });

  it("rejects a slot extending past the block's end", () => {
    expect(isWithinAvailability("MONDAY", "11:45", "12:15", blocks)).toBe(false);
  });
});

describe("isDuringLeave", () => {
  const leaves = [{ startDate: "2026-09-10", endDate: "2026-09-12" }];

  it("flags a date inside the leave range", () => {
    expect(isDuringLeave("2026-09-11", leaves)).toBe(true);
  });

  it("flags the boundary dates as inclusive", () => {
    expect(isDuringLeave("2026-09-10", leaves)).toBe(true);
    expect(isDuringLeave("2026-09-12", leaves)).toBe(true);
  });

  it("does not flag a date outside the range", () => {
    expect(isDuringLeave("2026-09-13", leaves)).toBe(false);
  });
});
