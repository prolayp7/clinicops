import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  staffProfile: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  staffSession: { deleteMany: vi.fn() },
  auditLog: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const mockAuthProvider = vi.hoisted(() => ({
  adminCreateUser: vi.fn(),
  adminSetPassword: vi.fn(),
  adminUpdateEmail: vi.fn(),
}));
vi.mock("@/lib/auth/providers", () => ({ authProvider: () => mockAuthProvider }));

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

import {
  createStaffUser,
  listStaff,
  resetStaffPassword,
  setStaffStatus,
  updateStaffProfile,
  updateStaffRole,
} from "@/server/services/users-service";
import { listAuditLogs } from "@/server/services/audit-logs-service";

const actor = (role: Role, id = "actor-1") => ({ profile: { id, role } }) as CurrentUser;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffProfile.findMany.mockResolvedValue([]);
  db.staffProfile.count.mockResolvedValue(0);
  db.staffProfile.findUnique.mockResolvedValue(null);
  db.staffProfile.update.mockResolvedValue({ id: "staff-2", role: Role.NURSE });
  db.staffSession.deleteMany.mockResolvedValue({ count: 1 });
  db.auditLog.findMany.mockResolvedValue([]);
  db.auditLog.count.mockResolvedValue(0);
});

describe("users-service authorization", () => {
  it.each([Role.DOCTOR, Role.RECEPTIONIST])(
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

  it("allows Admin to manage ordinary staff accounts", async () => {
    mockAuthProvider.adminCreateUser.mockResolvedValue({ authUserId: "staff-2", passwordHash: null });
    mockAuthProvider.adminSetPassword.mockResolvedValue({ passwordHash: "new-hash" });
    db.staffProfile.create.mockResolvedValue({ id: "staff-2", role: Role.NURSE });
    db.staffProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "staff-2", role: Role.NURSE })
      .mockResolvedValueOnce({ id: "staff-2", role: Role.DOCTOR })
      .mockResolvedValueOnce({ id: "staff-2", role: Role.DOCTOR });

    await expect(
      createStaffUser(actor(Role.ADMIN), { fullName: "New Person", email: "new@example.test", role: Role.NURSE }),
    ).resolves.toMatchObject({ staff: { id: "staff-2" } });
    await expect(updateStaffRole(actor(Role.ADMIN), "staff-2", Role.DOCTOR)).resolves.toMatchObject({ role: Role.NURSE });
    await expect(setStaffStatus(actor(Role.ADMIN), "staff-2", "ARCHIVED")).resolves.toMatchObject({ role: Role.NURSE });
    await expect(resetStaffPassword(actor(Role.ADMIN), "staff-2")).resolves.toHaveProperty("temporaryPassword");

    expect(mockAuthProvider.adminCreateUser).toHaveBeenCalledOnce();
    expect(mockAuthProvider.adminSetPassword).toHaveBeenCalledOnce();
    expect(db.staffSession.deleteMany).toHaveBeenCalledWith({ where: { staffId: "staff-2" } });
  });

  it("updates staff profile fields and synchronizes a changed login email", async () => {
    mockAuthProvider.adminUpdateEmail.mockResolvedValue({});
    db.staffProfile.findUnique
      .mockResolvedValueOnce({ id: "staff-2", role: Role.NURSE, email: "old@example.test" })
      .mockResolvedValueOnce({ id: "staff-2" });
    db.staffProfile.update.mockResolvedValue({ id: "staff-2", role: Role.NURSE, fullName: "Updated Name" });

    await updateStaffProfile(actor(Role.ADMIN), "staff-2", {
      fullName: " Updated Name ",
      email: "NEW@example.test",
    });

    expect(mockAuthProvider.adminUpdateEmail).toHaveBeenCalledWith("staff", "staff-2", "new@example.test");
    expect(db.staffProfile.update).toHaveBeenCalledWith({
      where: { id: "staff-2" },
      data: { fullName: "Updated Name", email: "new@example.test" },
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "staff.profile_updated",
      metadata: { fields: ["fullName", "email"] },
    }));
  });

  it("rejects duplicate staff email without changing provider or profile", async () => {
    db.staffProfile.findUnique
      .mockResolvedValueOnce({ id: "staff-2", role: Role.NURSE, email: "old@example.test" })
      .mockResolvedValueOnce({ id: "another-staff", email: "new@example.test" });

    await expect(
      updateStaffProfile(actor(Role.ADMIN), "staff-2", { fullName: "New Name", email: "new@example.test" }),
    ).rejects.toThrow("already exists");
    expect(mockAuthProvider.adminUpdateEmail).not.toHaveBeenCalled();
    expect(db.staffProfile.update).not.toHaveBeenCalled();
  });

  it("prevents Admin from creating or changing Super Admin accounts", async () => {
    await expect(
      createStaffUser(actor(Role.ADMIN), {
        fullName: "Platform Admin",
        email: "platform@example.test",
        role: Role.SUPER_ADMIN,
      }),
    ).rejects.toThrow("Only a Super Admin");
    expect(mockAuthProvider.adminCreateUser).not.toHaveBeenCalled();

    db.staffProfile.findUnique.mockResolvedValue({ id: "super-admin", role: Role.SUPER_ADMIN });
    await expect(updateStaffRole(actor(Role.ADMIN), "super-admin", Role.DOCTOR)).rejects.toThrow("Only a Super Admin");
    await expect(setStaffStatus(actor(Role.ADMIN), "super-admin", "ARCHIVED")).rejects.toThrow("Only a Super Admin");
    await expect(resetStaffPassword(actor(Role.ADMIN), "super-admin")).rejects.toThrow("Only a Super Admin");
    await expect(
      updateStaffProfile(actor(Role.ADMIN), "super-admin", {
        fullName: "Changed Name",
        email: "changed@example.test",
      }),
    ).rejects.toThrow("Only a Super Admin");
    expect(db.staffProfile.update).not.toHaveBeenCalled();
    expect(mockAuthProvider.adminSetPassword).not.toHaveBeenCalled();
    expect(mockAuthProvider.adminUpdateEmail).not.toHaveBeenCalled();
  });

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

  it("applies role, date, search, and pagination filters to the activity log", async () => {
    await listAuditLogs(actor(Role.ADMIN), {
      search: "staff.login",
      actorRole: Role.PATIENT,
      from: "2026-10-01",
      to: "2026-10-05",
      page: 2,
      pageSize: 10,
    });

    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        actorRole: Role.PATIENT,
        createdAt: { gte: new Date("2026-10-01T00:00:00.000Z"), lte: new Date("2026-10-05T23:59:59.999Z") },
        OR: [
          { action: { contains: "staff.login", mode: "insensitive" } },
          { entityType: { contains: "staff.login", mode: "insensitive" } },
          { entityId: { contains: "staff.login", mode: "insensitive" } },
        ],
      },
      skip: 10,
      take: 10,
    }));
  });
});
