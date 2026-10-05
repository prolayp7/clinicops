import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  staffProfile: { findUnique: vi.fn() },
  patientAccount: { findUnique: vi.fn(), update: vi.fn() },
  $queryRaw: vi.fn().mockResolvedValue([{ count: 1 }]),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

const provider = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth/providers", () => ({ authProvider: () => provider }));

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent }));

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/shared/app-shell", () => ({ AppShell: () => null }));

import { getCurrentUser } from "@/lib/auth/session";
import { loginAction } from "@/app/(auth)/login/actions";
import { signOutAction } from "@/lib/auth/actions";
import { portalLoginAction } from "@/app/portal/login/actions";
import { signOutPortalAction } from "@/app/portal/(protected)/actions";
import DashboardLayout from "@/app/(dashboard)/layout";

const profile = (over: Record<string, unknown> = {}) => ({
  id: "staff-1",
  email: "doctor@example.test",
  fullName: "Dr. Test",
  role: Role.DOCTOR,
  status: "ACTIVE",
  ...over,
});

const loginForm = () => {
  const form = new FormData();
  form.set("email", "doctor@example.test");
  form.set("password", "correct-password");
  return form;
};

beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw.mockResolvedValue([{ count: 1 }]);
});

describe("getCurrentUser", () => {
  it("returns null when there is no session", async () => {
    provider.getAuthUserId.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(db.staffProfile.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the session has no staff profile", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("denies an archived user even with a valid session", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile({ status: "ARCHIVED" }));
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the user for an active profile", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile());
    await expect(getCurrentUser()).resolves.toMatchObject({ authUserId: "staff-1", email: "doctor@example.test" });
  });
});

describe("loginAction", () => {
  it("rejects an archived user with the generic error and clears the session it just made", async () => {
    provider.signIn.mockResolvedValue({ ok: true, authUserId: "staff-1" });
    db.staffProfile.findUnique.mockResolvedValue(profile({ status: "ARCHIVED" }));

    const result = await loginAction({ error: null }, loginForm());

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(provider.signOut).toHaveBeenCalledWith("staff");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a Patient-role profile from the staff login", async () => {
    provider.signIn.mockResolvedValue({ ok: true, authUserId: "staff-1" });
    db.staffProfile.findUnique.mockResolvedValue(profile({ role: Role.PATIENT }));

    await expect(loginAction({ error: null }, loginForm())).resolves.toEqual({ error: "Invalid email or password." });
    expect(provider.signOut).toHaveBeenCalledWith("staff");
  });

  it("returns the generic error for bad credentials without querying profiles", async () => {
    provider.signIn.mockResolvedValue({ ok: false, error: "anything" });
    await expect(loginAction({ error: null }, loginForm())).resolves.toEqual({ error: "Invalid email or password." });
    expect(db.staffProfile.findUnique).not.toHaveBeenCalled();
  });

  it("redirects an active staff user after sign-in", async () => {
    provider.signIn.mockResolvedValue({ ok: true, authUserId: "staff-1" });
    db.staffProfile.findUnique.mockResolvedValue(profile());
    await expect(loginAction({ error: null }, loginForm())).rejects.toThrow("REDIRECT:/dashboard");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "staff-1",
      action: "staff.login_succeeded",
      entityType: "StaffProfile",
    }));
  });

  it("blocks staff login when the rate limit is exceeded", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 11 }]);

    await expect(loginAction({ error: null }, loginForm())).resolves.toEqual({
      error: "Too many attempts. Try again in a few minutes.",
    });
    expect(provider.signIn).not.toHaveBeenCalled();
  });

  it("audits patient portal login without using the staff actor foreign key", async () => {
    provider.signIn.mockResolvedValue({ ok: true, authUserId: "patient-account-1" });
    db.patientAccount.findUnique.mockResolvedValue({ id: "patient-account-1", status: "ACTIVE" });

    await expect(portalLoginAction({ error: null }, loginForm())).rejects.toThrow("REDIRECT:/portal");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: null,
      actorRole: Role.PATIENT,
      action: "patient.login_succeeded",
      entityType: "PatientAccount",
      entityId: "patient-account-1",
    }));
  });

  it("audits staff logout and redirects after clearing the session", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile());

    await expect(signOutAction()).rejects.toThrow("REDIRECT:/login");
    expect(provider.signOut).toHaveBeenCalledWith("staff");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "staff-1",
      action: "staff.logged_out",
    }));
  });

  it("audits patient portal logout and redirects after clearing the session", async () => {
    provider.getAuthUserId.mockResolvedValue("patient-account-1");
    db.patientAccount.findUnique.mockResolvedValue({
      id: "patient-account-1",
      status: "ACTIVE",
      patient: { id: "patient-1" },
    });

    await expect(signOutPortalAction()).rejects.toThrow("REDIRECT:/portal/login");
    expect(provider.signOut).toHaveBeenCalledWith("patient");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: null,
      actorRole: Role.PATIENT,
      action: "patient.logged_out",
      entityId: "patient-account-1",
    }));
  });
});

describe("dashboard layout guard (covers every staff page)", () => {
  it("redirects unauthenticated visitors to /login", async () => {
    provider.getAuthUserId.mockResolvedValue(null);
    await expect(DashboardLayout({ children: null })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects an archived user to /login", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile({ status: "ARCHIVED" }));
    await expect(DashboardLayout({ children: null })).rejects.toThrow("REDIRECT:/login");
  });

  it("refuses the Patient role", async () => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile({ role: Role.PATIENT }));
    await expect(DashboardLayout({ children: null })).rejects.toThrow();
  });

  it.each(Object.values(Role).filter((r) => r !== Role.PATIENT))("renders the shell for %s", async (role) => {
    provider.getAuthUserId.mockResolvedValue("staff-1");
    db.staffProfile.findUnique.mockResolvedValue(profile({ role }));
    await expect(DashboardLayout({ children: null })).resolves.toBeTruthy();
  });
});
