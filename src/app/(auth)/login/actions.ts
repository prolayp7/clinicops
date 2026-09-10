"use server";

import { safeRedirect } from "@/lib/auth/safe-redirect";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  const profile = data.user ? await prisma.staffProfile.findUnique({ where: { id: data.user.id } }) : null;
  if (!profile || profile.status !== "ACTIVE" || profile.role === "PATIENT") {
    await supabase.auth.signOut();
    return { error: "Invalid email or password." };
  }
  redirect(safeRedirect(formData.get("next")));
}
