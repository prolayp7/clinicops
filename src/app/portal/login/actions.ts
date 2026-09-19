"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/common";

export type PortalLoginFormState = { error: string | null };

export async function portalLoginAction(
  _prevState: PortalLoginFormState,
  formData: FormData,
): Promise<PortalLoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password (minimum 8 characters)." };
  }

  const provider = authProvider();
  const result = await provider.signIn("patient", parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return { error: "Invalid email or password." };
  }

  const account = await prisma.patientAccount.findUnique({ where: { id: result.authUserId } });
  if (!account || account.status === "ARCHIVED") {
    await provider.signOut("patient");
    return { error: "This portal account is not active. Contact the clinic for help." };
  }

  await prisma.patientAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });

  redirect("/portal");
}
