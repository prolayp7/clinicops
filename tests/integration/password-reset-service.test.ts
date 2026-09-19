import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const provider = vi.hoisted(() => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));
vi.mock("@/lib/auth/providers", () => ({ authProvider: () => provider }));
const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

import { completeStaffPasswordReset, requestStaffPasswordReset } from "@/server/services/password-reset-service";
import { forgotPasswordAction } from "@/app/(auth)/forgot-password/actions";

beforeEach(() => vi.clearAllMocks());

describe("password reset auditing", () => {
  it("audits a request only when an account was found", async () => {
    provider.requestPasswordReset.mockResolvedValue({ authUserId: null });
    await requestStaffPasswordReset("nobody@example.test");
    expect(recordAuditEvent).not.toHaveBeenCalled();

    provider.requestPasswordReset.mockResolvedValue({ authUserId: "staff-1" });
    await requestStaffPasswordReset("a@example.test");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "staff.password_reset_requested", entityId: "staff-1" }));
  });

  it("audits a completed reset but not a failed one", async () => {
    provider.resetPassword.mockResolvedValue({ ok: false, error: "bad" });
    await completeStaffPasswordReset("t", "new-password-1");
    expect(recordAuditEvent).not.toHaveBeenCalled();

    provider.resetPassword.mockResolvedValue({ ok: true, authUserId: "staff-1" });
    await completeStaffPasswordReset("t", "new-password-1");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "staff.password_reset_completed" }));
  });
});

describe("forgotPasswordAction", () => {
  const form = (email: string) => {
    const f = new FormData();
    f.set("email", email);
    return f;
  };

  it("answers identically whether or not the account exists or sending fails", async () => {
    provider.requestPasswordReset.mockResolvedValueOnce({ authUserId: "staff-1" });
    const ok = await forgotPasswordAction({ error: null, sent: false }, form("a@example.test"));

    vi.spyOn(console, "error").mockImplementation(() => {});
    provider.requestPasswordReset.mockRejectedValueOnce(new Error("SMTP down"));
    const failed = await forgotPasswordAction({ error: null, sent: false }, form("a@example.test"));

    expect(ok).toEqual({ error: null, sent: true });
    expect(failed).toEqual(ok);
  });

  it("rejects a malformed email without calling the provider", async () => {
    const result = await forgotPasswordAction({ error: null, sent: false }, form("not-an-email"));
    expect(result.sent).toBe(false);
    expect(provider.requestPasswordReset).not.toHaveBeenCalled();
  });
});
