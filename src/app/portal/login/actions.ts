"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const account = await prisma.patientAccount.findUnique({ where: { id: data.user.id } });
  if (!account || account.status === "ARCHIVED") {
    await supabase.auth.signOut();
    return { error: "This portal account is not active. Contact the clinic for help." };
  }

  await prisma.patientAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });

  redirect("/portal");
}
