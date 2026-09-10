import { describe, expect, it } from "vitest";
import {
  calculateAge,
  formatPatientId,
  isLikelyDuplicate,
  normalizeEmail,
  normalizePhone,
} from "@/lib/patients";

describe("normalizePhone", () => {
  it("strips formatting characters", () => {
    expect(normalizePhone("(555) 234-8900")).toBe("5552348900");
  });

  it("strips a leading country code plus sign", () => {
    expect(normalizePhone("+1 555 234 8900")).toBe("15552348900");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM  ")).toBe("jane.doe@example.com");
  });
});

describe("formatPatientId", () => {
  it("zero-pads to 6 digits with a PT- prefix", () => {
    expect(formatPatientId(1)).toBe("PT-000001");
    expect(formatPatientId(42)).toBe("PT-000042");
    expect(formatPatientId(123456)).toBe("PT-123456");
  });
});

describe("calculateAge", () => {
  it("computes a whole age from a fixed reference date", () => {
    const dob = new Date(Date.UTC(1990, 5, 15)); // June 15, 1990
    expect(calculateAge(dob, new Date(Date.UTC(2026, 5, 15)))).toBe(36);
  });

  it("has not had a birthday yet this year", () => {
    const dob = new Date(Date.UTC(1990, 11, 25)); // Dec 25, 1990
    expect(calculateAge(dob, new Date(Date.UTC(2026, 5, 15)))).toBe(35);
  });
});

describe("isLikelyDuplicate", () => {
  const base = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-06-15",
    normalizedPhone: "5552348900",
    normalizedEmail: "jane@example.com",
  };

  it("flags a matching normalized phone", () => {
    expect(
      isLikelyDuplicate(base, { ...base, firstName: "Different", normalizedEmail: null }),
    ).toBe(true);
  });

  it("flags a matching normalized email", () => {
    expect(
      isLikelyDuplicate(base, { ...base, normalizedPhone: "0000000000", lastName: "Different" }),
    ).toBe(true);
  });

  it("flags a matching name plus date of birth even with different contact info", () => {
    expect(
      isLikelyDuplicate(base, {
        ...base,
        normalizedPhone: "0000000000",
        normalizedEmail: "someone-else@example.com",
      }),
    ).toBe(true);
  });

  it("does not flag a genuinely different patient", () => {
    expect(
      isLikelyDuplicate(base, {
        firstName: "John",
        lastName: "Smith",
        dateOfBirth: "1985-01-01",
        normalizedPhone: "0000000000",
        normalizedEmail: "someone-else@example.com",
      }),
    ).toBe(false);
  });
});
