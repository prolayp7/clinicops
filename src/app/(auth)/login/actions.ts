"use server";

import { safeRedirect } from "@/lib/auth/safe-redirect";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";
import { loginSchema } from "@/lib/validation/common";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { recordAuditEvent } from "@/server/services/audit-service";

export type LoginFormState = { error: string | null };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password (minimum 8 characters)." };
  }

  try {
    await enforceRateLimit("staff-login", parsed.data.email);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const provider = authProvider();
  const result = await provider.signIn("staff", parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return { error: "Invalid email or password." };
  }

  const profile = await prisma.staffProfile.findUnique({ where: { id: result.authUserId } });
  if (!profile || profile.status !== "ACTIVE" || profile.role === "PATIENT") {
    await provider.signOut("staff");
    return { error: "Invalid email or password." };
  }

  try {
    await recordAuditEvent({
      actorId: profile.id,
      actorRole: profile.role,
      action: "staff.login_succeeded",
      entityType: "StaffProfile",
      entityId: profile.id,
    });
  } catch {
    await provider.signOut("staff");
    return { error: "Sign-in is temporarily unavailable. Please try again." };
  }

  redirect(safeRedirect(formData.get("next")));
}
