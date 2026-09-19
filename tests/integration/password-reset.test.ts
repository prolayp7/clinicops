import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => {
  const tx = {
    passwordResetToken: { updateMany: vi.fn() },
    staffProfile: { update: vi.fn<(a: { data: { passwordHash: string } }) => unknown>() },
    staffSession: { deleteMany: vi.fn() },
  };
  return {
    tx,
    staffProfile: { findUnique: vi.fn() },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn<(a: { data: { tokenHash: string; expiresAt: Date } }) => unknown>(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) => (typeof arg === "function" ? (arg as (t: typeof tx) => unknown)(tx) : arg)),
  };
});
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set: vi.fn() }) }));

const sendMail = vi.hoisted(() => vi.fn<(mail: { to: string; text: string }) => Promise<void>>());
vi.mock("@/lib/mailer", () => ({ sendMail }));

import { verifyPassword } from "@/lib/auth/password";
import { selfhostedAuthProvider } from "@/lib/auth/providers/selfhosted";
import { resetPasswordSchema } from "@/lib/validation/password-reset";

const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");
const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);
const tokenRecord = (over: Record<string, unknown> = {}) => ({
  id: "tok-1",
  staffId: "staff-1",
  usedAt: null,
  expiresAt: future(),
  staff: { id: "staff-1", status: "ACTIVE" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "https://clinic.example.test";
  db.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
});

describe("requestPasswordReset (selfhosted)", () => {
  it("sends nothing and reveals nothing for an unknown email", async () => {
    db.staffProfile.findUnique.mockResolvedValue(null);
    await expect(selfhostedAuthProvider.requestPasswordReset("nobody@example.test")).resolves.toEqual({ authUserId: null });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends nothing for an archived account", async () => {
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", status: "ARCHIVED", passwordHash: "x", email: "a@example.test" });
    await selfhostedAuthProvider.requestPasswordReset("a@example.test");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("stores only a hash of the token and emails the raw link", async () => {
    db.staffProfile.findUnique.mockResolvedValue({ id: "staff-1", status: "ACTIVE", passwordHash: "x", email: "a@example.test" });

    await expect(selfhostedAuthProvider.requestPasswordReset("a@example.test")).resolves.toEqual({ authUserId: "staff-1" });

    const mail = sendMail.mock.calls[0]![0];
    const raw = /token=([\w-]+)/.exec(mail.text)![1]!;
    expect(mail.to).toBe("a@example.test");
    expect(mail.text).toContain("https://clinic.example.test/reset-password?token=");
    const stored = db.passwordResetToken.create.mock.calls[0]![0].data;
    expect(stored.tokenHash).toBe(sha(raw));
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("resetPassword (selfhosted)", () => {
  it.each([
    ["an empty token", "", null],
    ["an unknown token", "nope", null],
    ["an expired token", "t", tokenRecord({ expiresAt: past() })],
    ["an already-used token", "t", tokenRecord({ usedAt: new Date() })],
    ["an archived account", "t", tokenRecord({ staff: { id: "staff-1", status: "ARCHIVED" } })],
  ])("rejects %s without changing anything", async (_label, token, record) => {
    db.passwordResetToken.findUnique.mockResolvedValue(record);
    const result = await selfhostedAuthProvider.resetPassword(token, "new-password-1");
    expect(result.ok).toBe(false);
    expect(db.tx.staffProfile.update).not.toHaveBeenCalled();
  });

  it("sets a hashed password, consumes the token and revokes all sessions", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(tokenRecord());

    const result = await selfhostedAuthProvider.resetPassword("raw-token", "new-password-1");

    expect(result).toEqual({ ok: true, authUserId: "staff-1" });
    expect(db.passwordResetToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: sha("raw-token") } }));
    const { passwordHash } = db.tx.staffProfile.update.mock.calls[0]![0].data;
    await expect(verifyPassword("new-password-1", passwordHash)).resolves.toBe(true);
    expect(db.tx.staffSession.deleteMany).toHaveBeenCalledWith({ where: { staffId: "staff-1" } });
  });

  it("rejects a token that was claimed concurrently (single use)", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(tokenRecord());
    db.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    const result = await selfhostedAuthProvider.resetPassword("raw-token", "new-password-1");

    expect(result.ok).toBe(false);
    expect(db.tx.staffProfile.update).not.toHaveBeenCalled();
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords of at least 8 characters", () => {
    expect(resetPasswordSchema.safeParse({ token: "t", password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "long-enough-1", confirmPassword: "different-1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "long-enough-1", confirmPassword: "long-enough-1" }).success).toBe(true);
  });
});
