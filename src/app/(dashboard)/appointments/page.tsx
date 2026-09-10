import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { listAppointments } from "@/server/services/appointments-service";
import { AppointmentFilters } from "./_components/appointment-filters";
import { ListView } from "./_components/list-view";
import { CalendarView } from "./_components/calendar-view";
import type { AppointmentStatus } from "@prisma/client";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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
  const view = params.view === "list" ? "list" : "calendar";
  const date = params.date || todayIso();
  const doctorId = params.doctorId || "";
  const status = params.status as AppointmentStatus | undefined;

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
