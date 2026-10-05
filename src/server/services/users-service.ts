import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, Role, type StaffStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { authProvider } from "@/lib/auth/providers";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { CreateStaffInput, UpdateStaffProfileInput } from "@/lib/validation/users";

/** A short, easy-to-relay temporary password — the staff member is expected to change it after
 * first login (or use "Forgot password?" once signed in for the first time). */
function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

export type ListStaffParams = {
  search?: string;
  role?: Role;
  status?: StaffStatus;
  page: number;
  pageSize: number;
};

function assertCanManageRole(actor: CurrentUser, role: Role) {
  if (actor.profile.role !== Role.SUPER_ADMIN && role === Role.SUPER_ADMIN) {
    throw new Error("Only a Super Admin can manage Super Admin accounts.");
  }
}

export async function listStaff(actor: CurrentUser, { search, role, status, page, pageSize }: ListStaffParams) {
  assertCan(actor.profile.role, "users:view");

  const where: Prisma.StaffProfileWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.staffProfile.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffProfile.count({ where }),
  ]);

  return { items, total };
}

export async function createStaffUser(actor: CurrentUser, input: CreateStaffInput) {
  assertCan(actor.profile.role, "users:manage");
  assertCanManageRole(actor, input.role);

  const existing = await prisma.staffProfile.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("A staff account with this email already exists.");

  const temporaryPassword = generateTemporaryPassword();
  const created = await authProvider().adminCreateUser("staff", input.email, temporaryPassword);
  if ("error" in created) {
    throw new Error(created.error);
  }

  const staff = await prisma.staffProfile.create({
    data: {
      id: created.authUserId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: created.passwordHash,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "staff.created",
    entityType: "StaffProfile",
    entityId: staff.id,
    metadata: { email: input.email, role: input.role },
  });

  return { staff, temporaryPassword };
}

export async function updateStaffProfile(actor: CurrentUser, staffId: string, input: UpdateStaffProfileInput) {
  assertCan(actor.profile.role, "users:manage");

  const target = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!target) throw new Error("Staff account not found.");
  assertCanManageRole(actor, target.role);

  const email = input.email.toLowerCase();
  const existing = await prisma.staffProfile.findUnique({ where: { email } });
  if (existing && existing.id !== staffId) {
    throw new Error("A staff account with this email already exists.");
  }

  if (email !== target.email) {
    const authResult = await authProvider().adminUpdateEmail("staff", target.id, email);
    if ("error" in authResult) throw new Error(authResult.error);
  }

  const staff = await prisma.staffProfile.update({
    where: { id: staffId },
    data: { fullName: input.fullName.trim(), email },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "staff.profile_updated",
    entityType: "StaffProfile",
    entityId: staff.id,
    metadata: { fields: ["fullName", "email"] },
  });

  return staff;
}

export async function updateStaffRole(actor: CurrentUser, staffId: string, role: Role) {
  assertCan(actor.profile.role, "users:manage");
  if (staffId === actor.profile.id) throw new Error("You cannot change your own role.");

  const target = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!target) throw new Error("Staff account not found.");
  assertCanManageRole(actor, target.role);
  assertCanManageRole(actor, role);

  const staff = await prisma.staffProfile.update({ where: { id: staffId }, data: { role } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "staff.role_changed",
    entityType: "StaffProfile",
    entityId: staff.id,
    metadata: { role },
  });

  return staff;
}

export async function setStaffStatus(actor: CurrentUser, staffId: string, status: StaffStatus) {
  assertCan(actor.profile.role, "users:manage");
  if (staffId === actor.profile.id) throw new Error("You cannot archive your own account.");

  const target = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!target) throw new Error("Staff account not found.");
  assertCanManageRole(actor, target.role);

  const staff = await prisma.staffProfile.update({
    where: { id: staffId },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

  if (status === "ARCHIVED") {
    // Belt-and-suspenders: the ARCHIVED check in getCurrentUser() already blocks this account on
    // every request regardless of provider, but dropping its self-hosted sessions too means a
    // revoked account doesn't linger in the session table until natural expiry.
    await prisma.staffSession.deleteMany({ where: { staffId } });
  }

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: status === "ARCHIVED" ? "staff.archived" : "staff.unarchived",
    entityType: "StaffProfile",
    entityId: staff.id,
  });

  return staff;
}

export async function resetStaffPassword(actor: CurrentUser, staffId: string) {
  assertCan(actor.profile.role, "users:manage");

  const staff = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!staff) throw new Error("Staff account not found.");
  assertCanManageRole(actor, staff.role);

  const temporaryPassword = generateTemporaryPassword();
  const result = await authProvider().adminSetPassword("staff", staff.id, temporaryPassword);
  if ("error" in result) throw new Error(result.error);

  await prisma.staffProfile.update({ where: { id: staff.id }, data: { passwordHash: result.passwordHash } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "staff.password_reset_by_admin",
    entityType: "StaffProfile",
    entityId: staff.id,
  });

  return { temporaryPassword };
}
