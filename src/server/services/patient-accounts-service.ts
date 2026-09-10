import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { adminClient } from "@/lib/storage";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { EnablePortalAccessInput } from "@/lib/validation/portal";

/** A short, easy-to-relay temporary password — the patient is expected to change it after first
 * login (no forced-change flow yet; see the portal's own "Change password" action). */
function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function getPortalAccountForPatient(patientId: string) {
  return prisma.patientAccount.findUnique({ where: { patientId } });
}

export async function enablePortalAccess(
  actor: CurrentUser,
  patientId: string,
  input: EnablePortalAccessInput,
) {
  assertCan(actor.profile.role, "patients:manage-portal-access");

  const existing = await prisma.patientAccount.findUnique({ where: { patientId } });
  if (existing) throw new Error("This patient already has a portal account.");

  const supabase = adminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the portal login.");
  }

  const account = await prisma.patientAccount.create({
    data: {
      id: data.user.id,
      patientId,
      email: input.email,
      createdById: actor.profile.id,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient_account.enabled",
    entityType: "PatientAccount",
    entityId: account.id,
    metadata: { patientId, email: input.email },
  });

  return { account, temporaryPassword };
}

export async function resetPortalPassword(actor: CurrentUser, patientId: string) {
  assertCan(actor.profile.role, "patients:manage-portal-access");

  const account = await prisma.patientAccount.findUnique({ where: { patientId } });
  if (!account) throw new Error("This patient does not have a portal account yet.");

  const supabase = adminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { error } = await supabase.auth.admin.updateUserById(account.id, { password: temporaryPassword });
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "patient_account.password_reset",
    entityType: "PatientAccount",
    entityId: account.id,
  });

  return { temporaryPassword };
}

export async function setPortalAccountStatus(
  actor: CurrentUser,
  patientId: string,
  status: "ACTIVE" | "ARCHIVED",
) {
  assertCan(actor.profile.role, "patients:manage-portal-access");

  const account = await prisma.patientAccount.update({ where: { patientId }, data: { status } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "patient_account.disabled" : "patient_account.enabled_again",
    entityType: "PatientAccount",
    entityId: account.id,
  });

  return account;
}
