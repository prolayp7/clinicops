"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth/providers";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { Role } from "@prisma/client";
import { recordAuditEvent } from "@/server/services/audit-service";

export async function signOutPortalAction(): Promise<void> {
  let actor = null;
  try {
    actor = await getCurrentPatient();
  } catch {
    actor = null;
  }

  await authProvider().signOut("patient");
  if (actor) {
    try {
      await recordAuditEvent({
        actorId: null,
        actorRole: Role.PATIENT,
        action: "patient.logged_out",
        entityType: "PatientAccount",
        entityId: actor.account.id,
      });
    } catch {
      // Logout must complete even if audit persistence is temporarily unavailable.
    }
  }
  redirect("/portal/login");
}
