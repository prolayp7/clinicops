import "server-only";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import type { CurrentUser } from "@/lib/auth/session";

export type ListAuditLogsParams = {
  search?: string;
  actorRole?: Role;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export async function listAuditLogs(actor: CurrentUser, params: ListAuditLogsParams) {
  assertCan(actor.profile.role, "audit-logs:view");

  const { search, actorRole, from, to, page, pageSize } = params;
  const where: Prisma.AuditLogWhereInput = {
    ...(actorRole ? { actorRole } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entityType: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}
