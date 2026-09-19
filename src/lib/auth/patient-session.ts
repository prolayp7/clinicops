import "server-only";
import { prisma } from "@/lib/db/prisma";
import { authProvider } from "@/lib/auth/providers";
import type { Patient, PatientAccount } from "@prisma/client";

export type CurrentPatient = {
  authUserId: string;
  email: string;
  account: PatientAccount;
  patient: Patient;
};

/** Resolves the authenticated user (via whichever AUTH_PROVIDER is active) as a patient-portal
 * identity, or null. Entirely separate from `getCurrentUser` (staff) — an authenticated identity
 * belongs to at most one of the two identity tables in practice, and this never consults
 * StaffProfile. */
export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const authUserId = await authProvider().getAuthUserId("patient");
  if (!authUserId) return null;

  const account = await prisma.patientAccount.findUnique({
    where: { id: authUserId },
    include: { patient: true },
  });
  if (!account || account.status === "ARCHIVED") return null;

  return { authUserId, email: account.email, account, patient: account.patient };
}
