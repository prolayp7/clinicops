import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { CreateStaffForm } from "../_components/create-staff-form";

export default async function NewStaffPage() {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "users:manage")) {
    redirect("/users");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">New Staff Account</h1>
        <p className="text-muted-foreground text-body">
          Creates a login and assigns a fixed system role. A one-time temporary password is
          generated — share it with the staff member through a secure channel.
        </p>
      </div>
      <Card className="p-6">
        <CreateStaffForm />
      </Card>
    </div>
  );
}
