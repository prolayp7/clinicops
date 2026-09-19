import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  staffSession: { findUnique: vi.fn() },
  patientSession: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { selfhostedAuthProvider } from "@/lib/auth/providers/selfhosted";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

beforeEach(() => vi.clearAllMocks());

describe("selfhosted auth provider — getAuthUserId", () => {
  it("returns null when there is no session cookie at all", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(selfhostedAuthProvider.getAuthUserId("staff")).resolves.toBeNull();
    expect(db.staffSession.findUnique).not.toHaveBeenCalled();
  });

  it("looks up the hashed cookie value, not the raw token", async () => {
    cookieStore.get.mockReturnValue({ value: "raw-cookie-token" });
    db.staffSession.findUnique.mockResolvedValue({ staffId: "staff-1", expiresAt: new Date(Date.now() + 60_000) });

    const result = await selfhostedAuthProvider.getAuthUserId("staff");

    expect(result).toBe("staff-1");
    expect(db.staffSession.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("raw-cookie-token") },
    });
  });

  it("returns null for an expired session even if the cookie is present", async () => {
    cookieStore.get.mockReturnValue({ value: "raw-cookie-token" });
    db.staffSession.findUnique.mockResolvedValue({ staffId: "staff-1", expiresAt: new Date(Date.now() - 1) });

    await expect(selfhostedAuthProvider.getAuthUserId("staff")).resolves.toBeNull();
  });

  it("reads the patient cookie for subject=patient, independent of the staff cookie", async () => {
    cookieStore.get.mockImplementation((name: string) =>
      name === "co_patient_session" ? { value: "patient-raw-token" } : undefined,
    );
    db.patientSession.findUnique.mockResolvedValue({
      patientAccountId: "account-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(selfhostedAuthProvider.getAuthUserId("patient")).resolves.toBe("account-1");
    expect(cookieStore.get).toHaveBeenCalledWith("co_patient_session");
  });
});
