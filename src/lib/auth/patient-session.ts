import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import type { Patient, PatientAccount } from "@prisma/client";

export type CurrentPatient = {
  supabaseUserId: string;
  email: string;
  account: PatientAccount;
  patient: Patient;
};

/** Resolves the authenticated Supabase user as a patient-portal identity, or null. Entirely
 * separate from `getCurrentUser` (staff) — a Supabase session belongs to at most one of the two
 * identity tables in practice, and this never consults StaffProfile. */
export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const account = await prisma.patientAccount.findUnique({
    where: { id: user.id },
    include: { patient: true },
  });
  if (!account || account.status === "ARCHIVED") return null;

  return { supabaseUserId: user.id, email: user.email ?? account.email, account, patient: account.patient };
}
