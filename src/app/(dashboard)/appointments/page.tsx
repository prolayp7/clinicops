import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { can } from "@/lib/permissions/policies";
import { dateToIsoDateInTimeZone } from "@/lib/scheduling";
import { prisma } from "@/lib/db/prisma";
import { appointmentFiltersSchema } from "@/lib/validation/appointments";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { listAppointments } from "@/server/services/appointments-service";
import { AppointmentFilters } from "./_components/appointment-filters";
import { ListView } from "./_components/list-view";
import { CalendarView } from "./_components/calendar-view";
import type { AppointmentStatus } from "@prisma/client";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "appointments:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "appointments:manage");

  const params = await searchParams;
  const parsedFilters = appointmentFiltersSchema.safeParse(params);
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const clinicSettings = await getClinicSettings();
  const timeZone = clinicSettings?.timezone ?? getEnv().CLINIC_TIMEZONE;
  const today = dateToIsoDateInTimeZone(new Date(), timeZone);
  const view = filters.view ?? "calendar";
  const date = filters.date ?? today;
  const doctorId = filters.doctorId ?? "";
  const status = filters.status;

  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE", ...(doctorId ? { id: doctorId } : {}) },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const { items } = await listAppointments(actor, {
    date: view === "calendar" ? date : undefined,
    doctorId: doctorId || undefined,
    status: view === "list" ? status : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Appointments</h1>
          <p className="text-muted-foreground text-body">
            Booking, doctor calendar and status workflow.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href={`/appointments/new?date=${date}${doctorId ? `&doctorId=${doctorId}` : ""}`}>
              <Plus className="size-4" />
              New Appointment
            </Link>
          </Button>
        )}
      </div>

      <AppointmentFilters date={date} doctorId={doctorId} status={status ?? ""} view={view} doctors={doctors} />

      {view === "calendar" ? (
        <CalendarView date={date} doctors={doctors} appointments={items} />
      ) : (
        <ListView appointments={items} />
      )}
    </div>
  );
}
