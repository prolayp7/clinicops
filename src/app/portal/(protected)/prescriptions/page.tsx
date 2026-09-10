import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { listPortalPrescriptions } from "@/server/services/portal-service";

export default async function PortalPrescriptionsPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const prescriptions = await listPortalPrescriptions(patient.patient.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Prescriptions</h1>
        <p className="text-muted-foreground text-body">Issued prescriptions from your visits.</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-body">No prescriptions yet.</Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-body text-foreground font-semibold">{rx.prescriptionNumber}</p>
                <p className="text-caption text-muted-foreground">
                  {rx.doctor.fullName} • {rx.issuedAt?.toISOString().slice(0, 10)}
                </p>
                <p className="text-caption text-muted-foreground">
                  {rx.items.map((i) => i.medicine.name).join(", ")}
                </p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <a href={`/api/prescriptions/${rx.id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  PDF
                </a>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
