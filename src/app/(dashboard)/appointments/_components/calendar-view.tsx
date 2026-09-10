import Link from "next/link";
import { Card } from "@/components/ui/card";
import { dateToTimeString } from "@/lib/scheduling";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import type { Prisma } from "@prisma/client";

type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: {
    patient: { select: { id: true; patientId: true; firstName: true; lastName: true; phone: true } };
    doctor: { select: { id: true; fullName: true; slotDurationMinutes: true } };
  };
}>;

export function CalendarView({
  date,
  doctors,
  appointments,
}: {
  date: string;
  doctors: { id: string; fullName: string }[];
  appointments: AppointmentRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {doctors.length === 0 && (
        <p className="text-muted-foreground text-body col-span-full">
          No active doctors to schedule against.
        </p>
      )}
      {doctors.map((doctor) => {
        const dayAppointments = appointments
          .filter((a) => a.doctor.id === doctor.id)
          .sort((a, b) => dateToTimeString(a.startTime).localeCompare(dateToTimeString(b.startTime)));

        return (
          <Card key={doctor.id} className="gap-3 p-4">
            <h3 className="text-section-title text-foreground font-semibold">{doctor.fullName}</h3>
            <div className="space-y-2">
              {dayAppointments.length === 0 && (
                <p className="text-caption text-muted-foreground">No appointments on {date}.</p>
              )}
              {dayAppointments.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/appointments/${appt.id}`}
                  className="border-border hover:bg-muted/60 block rounded-lg border p-2.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body text-foreground font-medium">
                      {dateToTimeString(appt.startTime)}
                    </span>
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                  <span className="text-caption text-muted-foreground block">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </span>
                  <span className="text-caption text-muted-foreground block truncate">
                    {appt.reason}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
