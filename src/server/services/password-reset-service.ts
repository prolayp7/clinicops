import "server-only";
import { authProvider } from "@/lib/auth/providers";
import { recordAuditEvent } from "@/server/services/audit-service";

/** Never reveals whether the email belongs to an account. */
export async function requestStaffPasswordReset(email: string): Promise<void> {
  const { authUserId } = await authProvider().requestPasswordReset(email);
  if (authUserId) {
    await recordAuditEvent({
      actorId: authUserId,
      actorRole: null,
      action: "staff.password_reset_requested",
      entityType: "StaffProfile",
      entityId: authUserId,
    });
  }
}

export async function completeStaffPasswordReset(token: string, password: string) {
  const result = await authProvider().resetPassword(token, password);
  if (result.ok) {
    await recordAuditEvent({
      actorId: result.authUserId,
      actorRole: null,
      action: "staff.password_reset_completed",
      entityType: "StaffProfile",
      entityId: result.authUserId,
    });
  }
  return result;
}
