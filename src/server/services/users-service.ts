import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type Role, type StaffStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { adminClient } from "@/lib/storage";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { CreateStaffInput } from "@/lib/validation/users";

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

export async function listStaff({ search, role, status, page, pageSize }: ListStaffParams) {
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

  const existing = await prisma.staffProfile.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("A staff account with this email already exists.");

  const supabase = adminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the staff login.");
  }

  const staff = await prisma.staffProfile.create({
    data: {
      id: data.user.id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
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

export async function updateStaffRole(actor: CurrentUser, staffId: string, role: Role) {
  assertCan(actor.profile.role, "users:manage");
  if (staffId === actor.profile.id) throw new Error("You cannot change your own role.");

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

  const staff = await prisma.staffProfile.update({
    where: { id: staffId },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });

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

  const supabase = adminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { error } = await supabase.auth.admin.updateUserById(staff.id, { password: temporaryPassword });
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "staff.password_reset",
    entityType: "StaffProfile",
    entityId: staff.id,
  });

  return { temporaryPassword };
}
