import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  staffProfile: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  auditLog: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const mockAuthProvider = vi.hoisted(() => ({
  adminCreateUser: vi.fn(),
  adminSetPassword: vi.fn(),
}));
vi.mock("@/lib/auth/providers", () => ({ authProvider: () => mockAuthProvider }));

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

import {
  createStaffUser,
  listStaff,
  resetStaffPassword,
  setStaffStatus,
  updateStaffRole,
} from "@/server/services/users-service";
import { listAuditLogs } from "@/server/services/audit-logs-service";

const actor = (role: Role, id = "actor-1") => ({ profile: { id, role } }) as CurrentUser;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffProfile.findMany.mockResolvedValue([]);
  db.staffProfile.count.mockResolvedValue(0);
  db.staffProfile.findUnique.mockResolvedValue(null);
  db.auditLog.findMany.mockResolvedValue([]);
  db.auditLog.count.mockResolvedValue(0);
});

describe("users-service authorization", () => {
  it.each([Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST])(
    "denies staff management for %s before touching Supabase or the database",
    async (role) => {
      await expect(
        createStaffUser(actor(role), { fullName: "New Person", email: "new@example.test", role: Role.NURSE }),
      ).rejects.toThrow();
      expect(mockAuthProvider.adminCreateUser).not.toHaveBeenCalled();

      await expect(updateStaffRole(actor(role), "staff-2", Role.NURSE)).rejects.toThrow();
      expect(db.staffProfile.update).not.toHaveBeenCalled();

      await expect(setStaffStatus(actor(role), "staff-2", "ARCHIVED")).rejects.toThrow();
      await expect(resetStaffPassword(actor(role), "staff-2")).rejects.toThrow();
      expect(mockAuthProvider.adminSetPassword).not.toHaveBeenCalled();
    },
  );

  it("allows Super Admin to create a staff account and records an audit event", async () => {
    mockAuthProvider.adminCreateUser.mockResolvedValue({ authUserId: "new-uuid", passwordHash: null });
    db.staffProfile.create.mockResolvedValue({ id: "new-uuid", email: "new@example.test", role: Role.NURSE });

    const { staff, temporaryPassword } = await createStaffUser(actor(Role.SUPER_ADMIN), {
      fullName: "New Person",
      email: "new@example.test",
      role: Role.NURSE,
    });

    expect(staff.id).toBe("new-uuid");
    expect(temporaryPassword).toBeTruthy();
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "staff.created" }));
  });

  it("prevents an actor from changing their own role or archiving themselves", async () => {
    await expect(updateStaffRole(actor(Role.SUPER_ADMIN, "self"), "self", Role.NURSE)).rejects.toThrow(
      "own role",
    );
    await expect(setStaffStatus(actor(Role.SUPER_ADMIN, "self"), "self", "ARCHIVED")).rejects.toThrow(
      "own account",
    );
    expect(db.staffProfile.update).not.toHaveBeenCalled();
  });

  it("denies listing staff to roles without users:view", async () => {
    await expect(listStaff(actor(Role.DOCTOR), { page: 1, pageSize: 10 })).rejects.toThrow();
    expect(db.staffProfile.findMany).not.toHaveBeenCalled();
  });

  it("allows Admin to list staff", async () => {
    await listStaff(actor(Role.ADMIN), { page: 1, pageSize: 10 });
    expect(db.staffProfile.findMany).toHaveBeenCalled();
  });
});

describe("audit-logs-service authorization", () => {
  it.each([Role.DOCTOR, Role.RECEPTIONIST, Role.ACCOUNTANT])(
    "denies the activity log to %s before touching the database",
    async (role) => {
      await expect(listAuditLogs(actor(role), { page: 1, pageSize: 10 })).rejects.toThrow();
      expect(db.auditLog.findMany).not.toHaveBeenCalled();
    },
  );

  it("allows Admin to read the activity log", async () => {
    await listAuditLogs(actor(Role.ADMIN), { page: 1, pageSize: 10 });
    expect(db.auditLog.findMany).toHaveBeenCalled();
  });
});
