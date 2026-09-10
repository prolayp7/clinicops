import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { ClinicSettingInput } from "@/lib/validation/doctors";

const CLINIC_SETTINGS_ID = "default";

/** Null until an admin saves the clinic profile for the first time. */
export async function getClinicSettings() {
  return prisma.clinicSetting.findUnique({ where: { id: CLINIC_SETTINGS_ID } });
}

export async function upsertClinicSettings(actor: CurrentUser, input: ClinicSettingInput) {
  assertCan(actor.profile.role, "settings:manage");

  const data = { ...input, addressLine2: input.addressLine2 || null };

  const settings = await prisma.clinicSetting.upsert({
    where: { id: CLINIC_SETTINGS_ID },
    create: { id: CLINIC_SETTINGS_ID, ...data },
    update: data,
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "clinic_settings.updated",
    entityType: "ClinicSetting",
    entityId: settings.id,
  });

  return settings;
}
