import { describe, expect, it } from "vitest";
import {
  amendConsultationSchema,
  completeConsultationSchema,
  saveDraftSchema,
  vitalsSchema,
} from "@/lib/validation/consultations";

describe("vitalsSchema", () => {
  it("accepts all-blank vitals (nothing recorded yet)", () => {
    const result = vitalsSchema.safeParse({
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      pulseBpm: "",
      temperatureCelsius: "",
      respiratoryRate: "",
      oxygenSaturationPercent: "",
      heightCm: "",
      weightKg: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pulseBpm).toBeNull();
    }
  });

  it("accepts plausible values", () => {
    const result = vitalsSchema.safeParse({
      bloodPressureSystolic: "120",
      bloodPressureDiastolic: "80",
      pulseBpm: "72",
      temperatureCelsius: "37.0",
      respiratoryRate: "16",
      oxygenSaturationPercent: "98",
      heightCm: "170",
      weightKg: "68.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range oxygen saturation", () => {
    const result = vitalsSchema.safeParse({ oxygenSaturationPercent: "150" });
    expect(result.success).toBe(false);
  });

  it("rejects a physiologically impossible pulse", () => {
    const result = vitalsSchema.safeParse({ pulseBpm: "900" });
    expect(result.success).toBe(false);
  });
});

describe("saveDraftSchema", () => {
  it("accepts a fully blank draft", () => {
    expect(saveDraftSchema.safeParse({}).success).toBe(true);
  });
});

describe("completeConsultationSchema", () => {
  it("requires a diagnosis and clinical notes", () => {
    expect(completeConsultationSchema.safeParse({}).success).toBe(false);
    expect(
      completeConsultationSchema.safeParse({ diagnosis: "Migraine", clinicalNotes: "" }).success,
    ).toBe(false);
  });

  it("accepts when diagnosis and clinical notes are present", () => {
    const result = completeConsultationSchema.safeParse({
      diagnosis: "Migraine",
      clinicalNotes: "Patient reports recurring headaches.",
    });
    expect(result.success).toBe(true);
  });
});

describe("amendConsultationSchema", () => {
  it("rejects an amendment with no reason", () => {
    expect(amendConsultationSchema.safeParse({ diagnosis: "Migraine" }).success).toBe(false);
  });

  it("accepts an amendment with a reason", () => {
    const result = amendConsultationSchema.safeParse({
      diagnosis: "Migraine, chronic",
      reason: "Corrected diagnosis after specialist review",
    });
    expect(result.success).toBe(true);
  });
});
