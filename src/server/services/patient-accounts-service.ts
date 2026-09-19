import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { authProvider } from "@/lib/auth/providers";
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

  const temporaryPassword = generateTemporaryPassword();
  const created = await authProvider().adminCreateUser("patient", input.email, temporaryPassword);
  if ("error" in created) {
    throw new Error(created.error);
  }

  const account = await prisma.patientAccount.create({
    data: {
      id: created.authUserId,
      patientId,
      email: input.email,
      createdById: actor.profile.id,
      passwordHash: created.passwordHash,
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

  const temporaryPassword = generateTemporaryPassword();
  const result = await authProvider().adminSetPassword("patient", account.id, temporaryPassword);
  if ("error" in result) throw new Error(result.error);

  await prisma.patientAccount.update({ where: { id: account.id }, data: { passwordHash: result.passwordHash } });

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

  if (status === "ARCHIVED") {
    await prisma.patientSession.deleteMany({ where: { patientAccountId: account.id } });
  }

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "patient_account.disabled" : "patient_account.enabled_again",
    entityType: "PatientAccount",
    entityId: account.id,
  });

  return account;
}
