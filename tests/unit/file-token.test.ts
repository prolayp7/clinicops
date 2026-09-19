// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFileToken, verifyFileToken } from "@/lib/file-token";

beforeEach(() => {
  vi.stubEnv("FILE_SIGNING_SECRET", "test-secret-do-not-use-in-production");
});
afterEach(() => vi.unstubAllEnvs());

describe("file token sign/verify", () => {
  it("round-trips a valid token back to its storage path", () => {
    const token = createFileToken("patient-documents/patient-1/report.pdf");
    expect(verifyFileToken(token)).toBe("patient-documents/patient-1/report.pdf");
  });

  it("rejects a tampered payload (path swapped, original signature kept)", () => {
    const token = createFileToken("patient-documents/patient-1/report.pdf");
    const [, signature] = token.split(".");
    const swappedPayload = Buffer.from("patient-documents/other-patient/report.pdf.9999999999", "utf8").toString(
      "base64url",
    );
    const tampered = `${swappedPayload}.${signature}`;
    expect(verifyFileToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createFileToken("patient-documents/patient-1/report.pdf");
    vi.stubEnv("FILE_SIGNING_SECRET", "a-different-secret");
    expect(verifyFileToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const token = createFileToken("patient-documents/patient-1/report.pdf");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(verifyFileToken(token)).toBeNull();
    vi.useRealTimers();
  });

  it("rejects a malformed token", () => {
    expect(verifyFileToken("not-a-real-token")).toBeNull();
    expect(verifyFileToken("")).toBeNull();
  });
});
