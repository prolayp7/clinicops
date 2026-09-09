import { describe, expect, it } from "vitest";
import { loginSchema, paginationSchema } from "@/lib/validation/common";

describe("loginSchema", () => {
  it("accepts a valid email/password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("defaults page and pageSize when omitted", () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it("caps pageSize at 100", () => {
    const result = paginationSchema.safeParse({ pageSize: 500 });
    expect(result.success).toBe(false);
  });
});
