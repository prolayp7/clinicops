import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { dateToTimeString } from "@/lib/scheduling";
import { listPortalAppointments } from "@/server/services/portal-service";

export default async function PortalAppointmentsPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const appointments = await listPortalAppointments(patient.patient.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Appointments</h1>
          <p className="text-muted-foreground text-body">
            Requests are reviewed by our team before they&apos;re confirmed.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/portal/appointments/new">
            <Plus className="size-4" />
            Request Appointment
          </Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-body">No appointments yet.</Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-body text-foreground font-semibold">
                  {appt.date.toISOString().slice(0, 10)} • {dateToTimeString(appt.startTime)}
                </p>
                <p className="text-caption text-muted-foreground">
                  with {appt.doctor.fullName} — {appt.reason}
                </p>
              </div>
              <Badge variant="secondary">{appt.status.replace("_", " ")}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
