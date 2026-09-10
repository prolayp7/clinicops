import { PhaseStub } from "@/components/shared/phase-stub";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "users:view")) redirect("/dashboard");
  return <PhaseStub title="Users" phase="Phase 1" />;
}
