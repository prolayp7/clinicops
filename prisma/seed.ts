import { randomUUID } from "node:crypto";
import { PrismaClient, Role } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Fictional, de-identified seed data only. Never insert real patient or staff data here.
const FICTIONAL_STAFF: Array<{ email: string; fullName: string; role: Role }> = [
  { email: "super.admin@example.test", fullName: "Sam Admin", role: Role.SUPER_ADMIN },
  { email: "admin@example.test", fullName: "Alex Admin", role: Role.ADMIN },
  { email: "doctor@example.test", fullName: "Dr. Jamie Rivera", role: Role.DOCTOR },
  { email: "reception@example.test", fullName: "Riley Front", role: Role.RECEPTIONIST },
  { email: "nurse@example.test", fullName: "Nur Sedgwick", role: Role.NURSE },
  { email: "lab@example.test", fullName: "Lee Analyst", role: Role.LAB_TECHNICIAN },
  { email: "accounts@example.test", fullName: "Casey Ledger", role: Role.ACCOUNTANT },
];

// Shared password for every fictional account. Fine as a checked-in default: these are
// throwaway accounts, never real staff or patients.
const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "ClinicOps-Dev-Seed-2026";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Seeding creates real Supabase Auth users and needs the project URL and service role key in .env.`,
    );
  }
  return value;
}

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  // supabase-js has no admin "get user by email" lookup, so page through listUsers.
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function upsertAuthUser(supabase: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  if (!error) return data.user.id;

  const alreadyExists = error.status === 422 || /already been registered/i.test(error.message);
  if (!alreadyExists) throw error;

  const existingId = await findAuthUserIdByEmail(supabase, email);
  if (!existingId) throw error;
  return existingId;
}

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true" || process.env.NODE_ENV === "production") throw new Error("Demo seeding requires ALLOW_DEMO_SEED=true in a non-production environment.");

  const selfhosted = process.env.AUTH_PROVIDER === "selfhosted";
  // Deliberately not imported from src/lib/auth/providers: that module is guarded by
  // "server-only", which throws when required outside Next's server bundler (this script runs
  // as a plain tsx process). Inlining the same two primitives (bcrypt hash, random uuid) keeps
  // the script standalone while still producing rows the self-hosted auth provider can log into.
  const passwordHash = selfhosted ? await bcrypt.hash(SEED_PASSWORD, 12) : null;
  const supabase = selfhosted
    ? null
    : createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  for (const staff of FICTIONAL_STAFF) {
    let authUserId: string;
    if (selfhosted) {
      // Reuse the existing row's id across reseeds (there is no external identity provider to
      // ask, unlike the Supabase branch's upsertAuthUser) so sessions/audit history tied to it
      // survive; only generate a fresh id the first time this email is seeded.
      const existing = await prisma.staffProfile.findUnique({ where: { email: staff.email } });
      authUserId = existing?.id ?? randomUUID();
    } else {
      authUserId = await upsertAuthUser(supabase!, staff.email);
    }

    // The auth user id is the source of truth; drop any stale profile row left over from a
    // previous seed run under a different id for the same email.
    await prisma.staffProfile.deleteMany({
      where: { email: staff.email, NOT: { id: authUserId } },
    });

    await prisma.staffProfile.upsert({
      where: { email: staff.email },
      update: { ...staff, ...(selfhosted ? { passwordHash } : {}) },
      create: { id: authUserId, ...staff, ...(selfhosted ? { passwordHash } : {}) },
    });

    console.log(`Seeded ${staff.role} — ${staff.email}`);
  }

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed. Check staging configuration; sensitive provider errors are suppressed.");
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
