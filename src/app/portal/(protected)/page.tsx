import Link from "next/link";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/billing";
import { dateToTimeString } from "@/lib/scheduling";
import { getPortalDashboard } from "@/server/services/portal-service";

export default async function PortalHomePage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const { nextAppointment, latestPrescription, latestLabOrder, latestInvoice } = await getPortalDashboard(
    patient.patient.id,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">
          Welcome, {patient.patient.firstName}
        </h1>
        <p className="text-muted-foreground text-body">Your care summary at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="space-y-1 p-5">
          <h2 className="text-body text-foreground font-semibold">Next Appointment</h2>
          {nextAppointment ? (
            <div>
              <p className="text-body text-foreground">
                {nextAppointment.date.toISOString().slice(0, 10)} at{" "}
                {dateToTimeString(nextAppointment.startTime)}
              </p>
              <p className="text-caption text-muted-foreground">with {nextAppointment.doctor.fullName}</p>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">No upcoming appointments.</p>
          )}
          <Link href="/portal/appointments" className="text-caption text-primary hover:underline">
            View all appointments →
          </Link>
        </Card>

        <Card className="space-y-1 p-5">
          <h2 className="text-body text-foreground font-semibold">Latest Prescription</h2>
          {latestPrescription ? (
            <div>
              <p className="text-body text-foreground">{latestPrescription.prescriptionNumber}</p>
              <p className="text-caption text-muted-foreground">
                {latestPrescription.doctor.fullName} •{" "}
                {latestPrescription.issuedAt?.toISOString().slice(0, 10)}
              </p>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">No prescriptions yet.</p>
          )}
          <Link href="/portal/prescriptions" className="text-caption text-primary hover:underline">
            View all prescriptions →
          </Link>
        </Card>

        <Card className="space-y-1 p-5">
          <h2 className="text-body text-foreground font-semibold">Latest Lab Report</h2>
          {latestLabOrder ? (
            <div>
              <p className="text-body text-foreground">{latestLabOrder.orderNumber}</p>
              <p className="text-caption text-muted-foreground">
                Reviewed {latestLabOrder.reviewedAt?.toISOString().slice(0, 10)}
              </p>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">No released lab reports yet.</p>
          )}
          <Link href="/portal/lab-reports" className="text-caption text-primary hover:underline">
            View all lab reports →
          </Link>
        </Card>

        <Card className="space-y-1 p-5">
          <h2 className="text-body text-foreground font-semibold">Latest Invoice</h2>
          {latestInvoice ? (
            <div>
              <p className="text-body text-foreground">
                {latestInvoice.invoiceNumber} — {formatCents(latestInvoice.totalCents)}
              </p>
              <p className="text-caption text-muted-foreground">
                Balance: {formatCents(latestInvoice.totalCents - latestInvoice.paidCents)}
              </p>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">No invoices yet.</p>
          )}
          <Link href="/portal/invoices" className="text-caption text-primary hover:underline">
            View billing →
          </Link>
        </Card>
      </div>
    </div>
  );
}
