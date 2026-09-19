"use server";

import { resetPasswordSchema } from "@/lib/validation/password-reset";
import { completeStaffPasswordReset } from "@/server/services/password-reset-service";

export type ResetPasswordState = { error: string | null; done: boolean };

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your entries.", done: false };
  }

  const result = await completeStaffPasswordReset(parsed.data.token, parsed.data.password);
  return result.ok ? { error: null, done: true } : { error: result.error, done: false };
}
