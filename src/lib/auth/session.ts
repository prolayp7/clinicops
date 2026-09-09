import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import type { StaffProfile } from "@prisma/client";

export type CurrentUser = {
  supabaseUserId: string;
  email: string;
  profile: StaffProfile;
};

/** Resolves the authenticated Supabase user plus their StaffProfile (role/status), or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.staffProfile.findUnique({ where: { id: user.id } });
  if (!profile || profile.status === "ARCHIVED") return null;

  return { supabaseUserId: user.id, email: user.email ?? profile.email, profile };
}
