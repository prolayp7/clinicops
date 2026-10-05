import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  staffProfile: { findUnique: vi.fn() },
  patientAccount: { findUnique: vi.fn() },
  staffSession: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  patientSession: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { hashPassword } from "@/lib/auth/password";
import { resolveSelfhostedToken, selfhostedAuthProvider } from "@/lib/auth/providers/selfhosted";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("selfhosted auth provider — signIn", () => {
  it("rejects an unknown email", async () => {
    db.staffProfile.findUnique.mockResolvedValue(null);
    const result = await selfhostedAuthProvider.signIn("staff", "nobody@example.test", "whatever");
    expect(result.ok).toBe(false);
  });

  it("rejects a Supabase-managed row with no passwordHash", async () => {
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash: null });
    const result = await selfhostedAuthProvider.signIn("staff", "someone@example.test", "whatever");
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash });
    const result = await selfhostedAuthProvider.signIn("staff", "someone@example.test", "wrong-password");
    expect(result.ok).toBe(false);
  });

  it("accepts the right password, creates a session row and sets a cookie", async () => {
    const passwordHash = await hashPassword("correct-password");
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash });

    const result = await selfhostedAuthProvider.signIn("staff", "someone@example.test", "correct-password");

    expect(result).toEqual({ ok: true, authUserId: "staff-1" });
    expect(db.staffSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ staffId: "staff-1" }) }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "co_staff_session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("keeps session cookies secure by default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", undefined);
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash: await hashPassword("correct-password") });

    await selfhostedAuthProvider.signIn("staff", "someone@example.test", "correct-password");

    expect(cookieStore.set).toHaveBeenCalledWith(
      "co_staff_session",
      expect.any(String),
      expect.objectContaining({ secure: true, httpOnly: true }),
    );
  });

  it("allows explicitly disabling Secure for an HTTP-only deployment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash: await hashPassword("correct-password") });

    await selfhostedAuthProvider.signIn("staff", "someone@example.test", "correct-password");

    expect(cookieStore.set).toHaveBeenCalledWith(
      "co_staff_session",
      expect.any(String),
      expect.objectContaining({ secure: false, httpOnly: true, sameSite: "lax" }),
    );
  });

  it("does not itself reject an archived account — that stays session.ts's job", async () => {
    // signIn only checks credentials; ARCHIVED enforcement lives in getCurrentUser/getCurrentPatient,
    // mirroring how the Supabase provider's signIn also doesn't know about StaffProfile.status.
    const passwordHash = await hashPassword("correct-password");
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", passwordHash, status: "ARCHIVED" });
    const result = await selfhostedAuthProvider.signIn("staff", "someone@example.test", "correct-password");
    expect(result.ok).toBe(true);
  });
});

describe("selfhosted auth provider — signOut", () => {
  it("deletes the session row matching the cookie and clears the cookie", async () => {
    cookieStore.get.mockReturnValue({ value: "raw-token" });
    await selfhostedAuthProvider.signOut("staff");
    expect(db.staffSession.deleteMany).toHaveBeenCalledWith({ where: { tokenHash: hashToken("raw-token") } });
    expect(cookieStore.set).toHaveBeenCalledWith("co_staff_session", "", expect.objectContaining({ maxAge: 0 }));
  });

  it("clears the cookie even when there is no session cookie to look up", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await selfhostedAuthProvider.signOut("patient");
    expect(db.patientSession.deleteMany).not.toHaveBeenCalled();
    expect(cookieStore.set).toHaveBeenCalledWith("co_patient_session", "", expect.objectContaining({ maxAge: 0 }));
  });
});

describe("selfhosted auth provider — admin operations", () => {
  it("adminCreateUser returns a fresh id and a verifiable hash", async () => {
    const result = await selfhostedAuthProvider.adminCreateUser("staff", "new@example.test", "temp-password");
    expect("error" in result).toBe(false);
    if ("error" in result) throw new Error("unreachable");
    expect(result.authUserId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.passwordHash).toBeTruthy();
  });

  it("adminSetPassword returns a hash the same password verifies against", async () => {
    const result = await selfhostedAuthProvider.adminSetPassword("staff", "staff-1", "new-temp-password");
    expect("error" in result).toBe(false);
    if ("error" in result) throw new Error("unreachable");
    const { verifyPassword } = await import("@/lib/auth/password");
    await expect(verifyPassword("new-temp-password", result.passwordHash!)).resolves.toBe(true);
  });
});

describe("resolveSelfhostedToken", () => {
  it("returns the owning id for a valid, unexpired token", async () => {
    db.staffSession.findUnique.mockResolvedValue({
      staffId: "staff-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(resolveSelfhostedToken("raw-token", "staff")).resolves.toBe("staff-1");
  });

  it("returns null for an unknown token", async () => {
    db.staffSession.findUnique.mockResolvedValue(null);
    await expect(resolveSelfhostedToken("bogus", "staff")).resolves.toBeNull();
  });

  it("returns null for an expired token", async () => {
    db.staffSession.findUnique.mockResolvedValue({
      staffId: "staff-1",
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(resolveSelfhostedToken("raw-token", "staff")).resolves.toBeNull();
  });

  it("looks up the patient session table for subject=patient", async () => {
    db.patientSession.findUnique.mockResolvedValue({
      patientAccountId: "account-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(resolveSelfhostedToken("raw-token", "patient")).resolves.toBe("account-1");
    expect(db.staffSession.findUnique).not.toHaveBeenCalled();
  });
});
