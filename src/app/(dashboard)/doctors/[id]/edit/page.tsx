import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listActiveDepartments } from "@/server/services/departments-service";
import { listActiveSpecializations } from "@/server/services/specializations-service";
import { getDoctorById } from "@/server/services/doctors-service";
import { DoctorForm } from "../../_components/doctor-form";
import { updateDoctorAction } from "../../actions";

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "doctors:manage")) {
    redirect("/doctors");
  }

  const { id } = await params;
  const [doctor, departments, specializations] = await Promise.all([
    getDoctorById(id),
    listActiveDepartments(),
    listActiveSpecializations(),
  ]);
  if (!doctor) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Edit {doctor.fullName}</h1>
      </div>
      <Card className="p-6">
        <DoctorForm
          action={updateDoctorAction.bind(null, id)}
          departments={departments}
          specializations={specializations}
          initial={doctor}
        />
      </Card>
    </div>
  );
}
