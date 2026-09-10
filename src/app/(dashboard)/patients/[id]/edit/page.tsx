import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { getPatientById } from "@/server/services/patients-service";
import { EditForm } from "./edit-form";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "patients:manage")) {
    redirect("/patients");
  }

  const { id } = await params;
  const patient = await getPatientById(actor, id);
  if (!patient) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-page-title text-foreground font-bold">
        Edit {patient.firstName} {patient.lastName}
      </h1>
      <Card className="max-w-2xl p-6">
        <EditForm patientId={id} initial={patient} />
      </Card>
    </div>
  );
}
