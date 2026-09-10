import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function PortalProtectedLayout({ children }: { children: React.ReactNode }) {
  const patient = await getCurrentPatient();

  if (!patient) {
    redirect("/portal/login");
  }

  return (
    <PortalShell patientName={`${patient.patient.firstName} ${patient.patient.lastName}`}>
      {children}
    </PortalShell>
  );
}
