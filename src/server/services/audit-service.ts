import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Prisma, Role } from "@prisma/client";

export type AuditEvent = {
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Writes an append-only audit event. Application code must never update or delete audit rows. */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
    },
  });
}
