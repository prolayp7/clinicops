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

export function ListView({ appointments }: { appointments: AppointmentRow[] }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-2.5 font-semibold">Patient</th>
            <th className="px-4 py-2.5 font-semibold">Doctor</th>
            <th className="px-4 py-2.5 font-semibold">Date &amp; time</th>
            <th className="px-4 py-2.5 font-semibold">Reason</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-border text-body divide-y">
          {appointments.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                No appointments match these filters.
              </td>
            </tr>
          )}
          {appointments.map((appt) => (
            <tr key={appt.id} className="hover:bg-muted/60 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/appointments/${appt.id}`} className="text-foreground font-semibold">
                  {appt.patient.firstName} {appt.patient.lastName}
                </Link>
                <span className="text-caption text-muted-foreground block">
                  #{appt.patient.patientId}
                </span>
              </td>
              <td className="text-foreground px-4 py-3">{appt.doctor.fullName}</td>
              <td className="text-foreground px-4 py-3">
                {appt.date.toISOString().slice(0, 10)} • {dateToTimeString(appt.startTime)}
              </td>
              <td className="text-foreground max-w-xs truncate px-4 py-3">{appt.reason}</td>
              <td className="px-4 py-3">
                <AppointmentStatusBadge status={appt.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
