"use server";

import { requestPasswordResetSchema } from "@/lib/validation/password-reset";
import { requestStaffPasswordReset } from "@/server/services/password-reset-service";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";

export type ForgotPasswordState = { error: string | null; sent: boolean };

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address.", sent: false };

  try {
    await enforceRateLimit("password-reset-request", parsed.data.email);
    await requestStaffPasswordReset(parsed.data.email);
  } catch (error) {
    // Logged for operators; the response stays identical so account existence/rate-limit state isn't revealed.
    if (!(error instanceof RateLimitExceededError)) {
      console.error("Password reset request failed:", error instanceof Error ? error.message : error);
    }
  }
  return { error: null, sent: true };
}
