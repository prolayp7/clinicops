import { describe, expect, it } from "vitest";
import { CLINICAL_FIELD_KEYS, computeChangedFields } from "@/lib/consultations";

describe("computeChangedFields", () => {
  it("returns no fields when nothing changed", () => {
    const before = { diagnosis: "Hypertension", pulseBpm: 72 };
    const after = { diagnosis: "Hypertension", pulseBpm: 72 };
    expect(computeChangedFields(before, after, ["diagnosis", "pulseBpm"])).toEqual([]);
  });

  it("flags only the fields that actually changed", () => {
    const before = { diagnosis: "Hypertension", pulseBpm: 72, notes: "stable" };
    const after = { diagnosis: "Hypertension, controlled", pulseBpm: 72, notes: "stable" };
    expect(computeChangedFields(before, after, ["diagnosis", "pulseBpm", "notes"])).toEqual([
      "diagnosis",
    ]);
  });

  it("treats null and undefined as equivalent (no false-positive change)", () => {
    const before = { notes: null };
    const after = { notes: undefined };
    expect(computeChangedFields(before, after, ["notes"])).toEqual([]);
  });

  it("compares Date values by their ISO form", () => {
    const before = { followUpDate: new Date("2026-09-10T00:00:00.000Z") };
    const after = { followUpDate: new Date("2026-09-10T00:00:00.000Z") };
    expect(computeChangedFields(before, after, ["followUpDate"])).toEqual([]);

    const changed = { followUpDate: new Date("2026-09-17T00:00:00.000Z") };
    expect(computeChangedFields(before, changed, ["followUpDate"])).toEqual(["followUpDate"]);
  });

  it("flags a field that went from a value to null", () => {
    const before = { diagnosis: "Migraine" };
    const after = { diagnosis: null };
    expect(computeChangedFields(before, after, ["diagnosis"])).toEqual(["diagnosis"]);
  });

  it("covers the full clinical field key list without throwing", () => {
    const before = Object.fromEntries(CLINICAL_FIELD_KEYS.map((k) => [k, null]));
    const after = Object.fromEntries(CLINICAL_FIELD_KEYS.map((k) => [k, null]));
    expect(computeChangedFields(before, after, CLINICAL_FIELD_KEYS)).toEqual([]);
  });
});
