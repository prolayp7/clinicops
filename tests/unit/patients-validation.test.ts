import { describe, expect, it } from "vitest";
import { Sex } from "@prisma/client";
import {
  patientClinicalSchema,
  patientDemographicsSchema,
  patientRegistrationSchema,
} from "@/lib/validation/patients";

describe("patientDemographicsSchema", () => {
  const valid = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-06-15",
    sex: Sex.FEMALE,
    phone: "555-234-8900",
  };

  it("accepts minimal valid demographics", () => {
    expect(patientDemographicsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing first name", () => {
    expect(patientDemographicsSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
  });

  it("rejects an invalid email when provided", () => {
    expect(
      patientDemographicsSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("accepts an empty-string email as optional", () => {
    expect(patientDemographicsSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });

  it("rejects a malformed date of birth", () => {
    expect(
      patientDemographicsSchema.safeParse({ ...valid, dateOfBirth: "06/15/1990" }).success,
    ).toBe(false);
  });
});

describe("patientClinicalSchema", () => {
  it("accepts empty lists and no history", () => {
    const result = patientClinicalSchema.safeParse({
      allergies: [],
      previousDiagnoses: [],
      currentMedications: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts populated lists and history text", () => {
    const result = patientClinicalSchema.safeParse({
      allergies: ["Penicillin"],
      medicalHistory: "Stable, no complications.",
      previousDiagnoses: ["Hypertension"],
      currentMedications: ["Lisinopril 10mg"],
    });
    expect(result.success).toBe(true);
  });
});

describe("patientRegistrationSchema", () => {
  it("merges demographics and clinical fields", () => {
    const result = patientRegistrationSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1990-06-15",
      sex: Sex.FEMALE,
      phone: "555-234-8900",
      allergies: ["Penicillin"],
      previousDiagnoses: [],
      currentMedications: [],
    });
    expect(result.success).toBe(true);
  });
});
