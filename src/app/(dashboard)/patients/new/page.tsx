import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { PatientRegistrationForm } from "../_components/patient-registration-form";

export default async function NewPatientPage() {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "patients:manage")) {
    redirect("/patients");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Register Patient</h1>
        <p className="text-muted-foreground text-body">
          Create a new patient record with a permanent, human-readable patient ID.
        </p>
      </div>
      <div className="max-w-2xl">
        <PatientRegistrationForm />
      </div>
    </div>
  );
}
