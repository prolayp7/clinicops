import "server-only";
import { prisma } from "@/lib/db/prisma";
import { authProvider } from "@/lib/auth/providers";
import type { StaffProfile } from "@prisma/client";

export type CurrentUser = {
  authUserId: string;
  email: string;
  profile: StaffProfile;
};

/** Resolves the authenticated user (via whichever AUTH_PROVIDER is active) plus their
 * StaffProfile (role/status), or null. This is the one place the "archived users cannot
 * authenticate" guarantee lives — it applies regardless of provider. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authUserId = await authProvider().getAuthUserId("staff");
  if (!authUserId) return null;

  const profile = await prisma.staffProfile.findUnique({ where: { id: authUserId } });
  if (!profile || profile.status === "ARCHIVED") return null;

  return { authUserId, email: profile.email, profile };
}
