"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";

export async function signOutAction(): Promise<void> {
  await authProvider().signOut("staff");
  redirect("/login");
}
