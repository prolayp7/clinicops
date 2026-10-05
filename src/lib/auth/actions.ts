"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAuditEvent } from "@/server/services/audit-service";

export async function signOutAction(): Promise<void> {
  let actor = null;
  try {
    actor = await getCurrentUser();
  } catch {
    actor = null;
  }

  await authProvider().signOut("staff");
  if (actor) {
    try {
      await recordAuditEvent({
        actorId: actor.profile.id,
        actorRole: actor.profile.role,
        action: "staff.logged_out",
        entityType: "StaffProfile",
        entityId: actor.profile.id,
      });
    } catch {
      // Logout must complete even if audit persistence is temporarily unavailable.
    }
  }
  redirect("/login");
}
