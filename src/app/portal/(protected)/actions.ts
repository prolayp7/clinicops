"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";

export async function signOutPortalAction(): Promise<void> {
  await authProvider().signOut("patient");
  redirect("/portal/login");
}
