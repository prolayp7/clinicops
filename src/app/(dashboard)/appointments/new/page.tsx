import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { BookingForm } from "../_components/booking-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "appointments:manage")) {
    redirect("/appointments");
  }
  const canOverride = can(actor.profile.role, "appointments:override-availability");

  const params = await searchParams;

  const [patients, doctors] = await Promise.all([
    prisma.patient.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, patientId: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.doctor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, specialization: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">New Appointment</h1>
        <p className="text-muted-foreground text-body">
          Availability and conflicts are checked automatically.
        </p>
      </div>
      <Card className="max-w-2xl p-6">
        <BookingForm
          patients={patients}
          doctors={doctors}
          canOverride={canOverride}
          defaultDoctorId={params.doctorId}
          defaultDate={params.date}
        />
      </Card>
    </div>
  );
}
