import { Role } from "@prisma/client";

export type Action = "dashboard:view";

/** Server-side permission table for Phase 0. Every later domain module adds its own
 * actions here rather than inferring access from the UI. */
const POLICY: Record<Action, ReadonlySet<Role>> = {
  "dashboard:view": new Set(
    Object.values(Role).filter((role) => role !== Role.PATIENT),
  ),
};

export function can(role: Role, action: Action): boolean {
  return POLICY[action].has(role);
}

export class ForbiddenError extends Error {
  constructor(action: Action) {
    super(`Role is not permitted to perform "${action}"`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new ForbiddenError(action);
  }
}
