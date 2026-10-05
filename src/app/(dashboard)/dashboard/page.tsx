import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";

const DASHBOARD_ROUTE_BY_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "super-admin",
  [Role.ADMIN]: "admin",
  [Role.DOCTOR]: "doctor",
  [Role.RECEPTIONIST]: "receptionist",
  [Role.NURSE]: "nurse",
  [Role.LAB_TECHNICIAN]: "lab",
  [Role.ACCOUNTANT]: "accountant",
  [Role.PATIENT]: "patient",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const route = DASHBOARD_ROUTE_BY_ROLE[user.profile.role];
  redirect(`/dashboard/${route}`);
}
