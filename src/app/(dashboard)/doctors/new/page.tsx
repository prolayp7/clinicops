import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listActiveDepartments } from "@/server/services/departments-service";
import { listActiveSpecializations } from "@/server/services/specializations-service";
import { listUnlinkedDoctorStaffProfiles } from "@/server/services/doctors-service";
import { DoctorForm } from "../_components/doctor-form";
import { createDoctorAction } from "../actions";

export default async function NewDoctorPage() {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "doctors:manage")) {
    redirect("/doctors");
  }

  const [departments, specializations, unlinkedStaff] = await Promise.all([
    listActiveDepartments(),
    listActiveSpecializations(),
    listUnlinkedDoctorStaffProfiles(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Register Doctor</h1>
        <p className="text-muted-foreground text-body">
          Link an existing Doctor-role staff account to a clinical directory profile.
        </p>
      </div>
      <Card className="p-6">
        <DoctorForm
          action={createDoctorAction}
          departments={departments}
          specializations={specializations}
          unlinkedStaff={unlinkedStaff}
        />
      </Card>
    </div>
  );
}
