import "server-only";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendMail } from "@/lib/mailer";
import type { AuthProvider, AuthSubject } from "./types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export const COOKIE_NAME: Record<AuthSubject, string> = {
  staff: "co_staff_session",
  patient: "co_patient_session",
};

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Resolves a raw session cookie value to the owning StaffProfile/PatientAccount id, or null if
 * missing/expired/unknown. Not callable from middleware.ts: session validation needs Prisma,
 * and this installed Next.js version has no Node.js-runtime middleware option (see the note in
 * middleware.ts) — access control for AUTH_PROVIDER=selfhosted relies entirely on the per-page
 * getCurrentUser()/getCurrentPatient() calls that call this indirectly via getAuthUserId(). */
export async function resolveSelfhostedToken(rawToken: string, subject: AuthSubject): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  if (subject === "staff") {
    const session = await prisma.staffSession.findUnique({ where: { tokenHash } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.staffId;
  }

  const session = await prisma.patientSession.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.patientAccountId;
}

export const selfhostedAuthProvider: AuthProvider = {
  async getAuthUserId(subject) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(COOKIE_NAME[subject])?.value;
    if (!rawToken) return null;
    return resolveSelfhostedToken(rawToken, subject);
  },

  async signIn(subject, email, password) {
    const record =
      subject === "staff"
        ? await prisma.staffProfile.findUnique({ where: { email } })
        : await prisma.patientAccount.findUnique({ where: { email } });

    if (!record || !record.passwordHash || !(await verifyPassword(password, record.passwordHash))) {
      return { ok: false, error: "Invalid email or password." };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    if (subject === "staff") {
      await prisma.staffSession.create({ data: { tokenHash: hashToken(rawToken), staffId: record.id, expiresAt } });
    } else {
      await prisma.patientSession.create({
        data: { tokenHash: hashToken(rawToken), patientAccountId: record.id, expiresAt },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME[subject], rawToken, cookieOptions(expiresAt));

    return { ok: true, authUserId: record.id };
  },

  async signOut(subject) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(COOKIE_NAME[subject])?.value;
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      if (subject === "staff") await prisma.staffSession.deleteMany({ where: { tokenHash } });
      else await prisma.patientSession.deleteMany({ where: { tokenHash } });
    }
    cookieStore.set(COOKIE_NAME[subject], "", { ...cookieOptions(new Date(0)), maxAge: 0 });
  },

  async adminCreateUser(_subject, _email, password) {
    const passwordHash = await hashPassword(password);
    return { authUserId: randomUUID(), passwordHash };
  },

  async adminSetPassword(_subject, _authUserId, password) {
    const passwordHash = await hashPassword(password);
    return { passwordHash };
  },

  async requestPasswordReset(email) {
    const staff = await prisma.staffProfile.findUnique({ where: { email } });
    if (!staff || staff.status !== "ACTIVE" || !staff.passwordHash) return { authUserId: null };

    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("APP_URL is not configured.");

    const rawToken = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { staffId: staff.id } }),
      prisma.passwordResetToken.create({
        data: { tokenHash: hashToken(rawToken), staffId: staff.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);

    await sendMail({
      to: staff.email,
      subject: "Reset your ClinicOps password",
      text: `Use this link within 1 hour to choose a new password:\n${appUrl}/reset-password?token=${rawToken}\n\nIf you did not request this, ignore this email.`,
    });
    return { authUserId: staff.id };
  },

  async resetPassword(token, password) {
    const invalid = { ok: false as const, error: "This reset link is invalid or has expired." };
    if (!token) return invalid;

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { staff: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.staff.status !== "ACTIVE") {
      return invalid;
    }

    const passwordHash = await hashPassword(password);
    const claimed = await prisma.$transaction(async (tx) => {
      const used = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) return false;
      await tx.staffProfile.update({ where: { id: record.staffId }, data: { passwordHash } });
      await tx.staffSession.deleteMany({ where: { staffId: record.staffId } });
      return true;
    });
    return claimed ? { ok: true, authUserId: record.staffId } : invalid;
  },
};
