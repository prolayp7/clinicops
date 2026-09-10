import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { ProfileForm } from "./_components/profile-form";

export default async function PortalProfilePage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Your Profile</h1>
        <p className="text-muted-foreground text-body">
          You can update your contact details here. For changes to your name, date of birth or
          medical information, please contact the clinic.
        </p>
      </div>
      <Card className="max-w-2xl p-6">
        <ProfileForm patient={patient.patient} />
      </Card>
    </div>
  );
}
