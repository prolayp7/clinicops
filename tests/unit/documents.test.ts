import { describe, expect, it } from "vitest";
import { canPatientAccessDocument } from "@/lib/documents";

describe("canPatientAccessDocument", () => {
  it("requires both ownership and an active (non-archived) status", () => {
    expect(canPatientAccessDocument("ACTIVE", true)).toBe(true);
    expect(canPatientAccessDocument("ACTIVE", false)).toBe(false);
    expect(canPatientAccessDocument("ARCHIVED", true)).toBe(false);
    expect(canPatientAccessDocument("ARCHIVED", false)).toBe(false);
  });
});
