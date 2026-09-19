"use server";

import { requestPasswordResetSchema } from "@/lib/validation/password-reset";
import { requestStaffPasswordReset } from "@/server/services/password-reset-service";

export type ForgotPasswordState = { error: string | null; sent: boolean };

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address.", sent: false };

  try {
    await requestStaffPasswordReset(parsed.data.email);
  } catch (error) {
    // Logged for operators; the response stays identical so account existence is not revealed.
    console.error("Password reset request failed:", error instanceof Error ? error.message : error);
  }
  return { error: null, sent: true };
}
