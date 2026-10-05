import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { can } from "@/lib/permissions/policies";
import { dateToIsoDateInTimeZone } from "@/lib/scheduling";
import { prisma } from "@/lib/db/prisma";
import { appointmentFiltersSchema } from "@/lib/validation/appointments";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
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
  const parsedFilters = appointmentFiltersSchema.safeParse(params);
  const filters = parsedFilters.success ? parsedFilters.data : {};

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
  const clinicSettings = await getClinicSettings();
  const timeZone = clinicSettings?.timezone ?? getEnv().CLINIC_TIMEZONE;
  const defaultDate = filters.date ?? dateToIsoDateInTimeZone(new Date(), timeZone);

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
          defaultDoctorId={filters.doctorId}
          defaultDate={defaultDate}
        />
      </Card>
    </div>
  );
}
