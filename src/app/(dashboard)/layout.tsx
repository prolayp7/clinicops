import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { assertCan } from "@/lib/permissions/policies";
import { AppShell } from "@/components/shared/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  assertCan(user.profile.role, "dashboard:view");

  return (
    <AppShell role={user.profile.role} fullName={user.profile.fullName}>
      {children}
    </AppShell>
  );
}
