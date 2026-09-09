import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Fictional, de-identified seed data only. Never insert real patient or staff data here.
// The ids below are placeholders; in a real environment they must match the Supabase Auth
// user ids created for each fictional account (StaffProfile.id === auth.users.id).
const FICTIONAL_STAFF: Array<{ id: string; email: string; fullName: string; role: Role }> = [
  { id: "00000000-0000-4000-8000-000000000001", email: "super.admin@example.test", fullName: "Sam Admin", role: Role.SUPER_ADMIN },
  { id: "00000000-0000-4000-8000-000000000002", email: "admin@example.test", fullName: "Alex Admin", role: Role.ADMIN },
  { id: "00000000-0000-4000-8000-000000000003", email: "doctor@example.test", fullName: "Dr. Jamie Rivera", role: Role.DOCTOR },
  { id: "00000000-0000-4000-8000-000000000004", email: "reception@example.test", fullName: "Riley Front", role: Role.RECEPTIONIST },
  { id: "00000000-0000-4000-8000-000000000005", email: "nurse@example.test", fullName: "Nur Sedgwick", role: Role.NURSE },
  { id: "00000000-0000-4000-8000-000000000006", email: "lab@example.test", fullName: "Lee Analyst", role: Role.LAB_TECHNICIAN },
  { id: "00000000-0000-4000-8000-000000000007", email: "accounts@example.test", fullName: "Casey Ledger", role: Role.ACCOUNTANT },
];

async function main() {
  for (const staff of FICTIONAL_STAFF) {
    await prisma.staffProfile.upsert({
      where: { id: staff.id },
      update: staff,
      create: staff,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
