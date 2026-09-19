"use server";

import { safeRedirect } from "@/lib/auth/safe-redirect";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";
import { loginSchema } from "@/lib/validation/common";

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
  redirect(safeRedirect(formData.get("next")));
}
