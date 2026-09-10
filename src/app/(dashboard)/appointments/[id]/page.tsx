import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { dateToTimeString } from "@/lib/scheduling";
import { getAppointmentById } from "@/server/services/appointments-service";
import { AppointmentStatusBadge } from "../_components/appointment-status-badge";
import { StatusActions } from "./_components/status-actions";
import { RescheduleDialog } from "./_components/reschedule-dialog";

const SOURCE_LABEL: Record<string, string> = {
  STAFF_BOOKED: "Staff booked",
  WALK_IN: "Walk-in",
  ONLINE_REQUEST: "Online request",
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "appointments:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const appointment = await getAppointmentById(actor, id);
  if (!appointment) notFound();

  const canManage = can(actor.profile.role, "appointments:manage");
  const canManageStatus = can(actor.profile.role, "appointments:manage-status");
  const canOverride = can(actor.profile.role, "appointments:override-availability");
  const canStartConsultation = can(actor.profile.role, "consultations:manage-vitals");

  return (
    <div className="space-y-4">
      <Card className="flex-row items-start justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-page-title text-foreground font-bold">
              <Link href={`/patients/${appointment.patient.id}`} className="hover:underline">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </Link>
            </h1>
            <AppointmentStatusBadge status={appointment.status} />
          </div>
          <p className="text-muted-foreground text-body">
            with{" "}
            <Link href={`/doctors/${appointment.doctor.id}`} className="hover:underline">
              {appointment.doctor.fullName}
            </Link>
          </p>
          <p className="text-caption text-muted-foreground">
            {appointment.date.toISOString().slice(0, 10)} • {dateToTimeString(appointment.startTime)}–
            {dateToTimeString(appointment.endTime)} • {SOURCE_LABEL[appointment.source]}
          </p>
        </div>
        {canManage && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status) && (
          <RescheduleDialog appointmentId={appointment.id} canOverride={canOverride} />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-section-title text-foreground mb-2 font-semibold">Reason for visit</h2>
        <p className="text-body text-foreground">{appointment.reason}</p>
      </Card>

      {canManageStatus && (
        <Card className="p-6">
          <h2 className="text-section-title text-foreground mb-3 font-semibold">Update status</h2>
          <StatusActions
            appointmentId={appointment.id}
            currentStatus={appointment.status}
            canStartConsultation={canStartConsultation}
          />
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-section-title text-foreground mb-3 font-semibold">Status history</h2>
        <ol className="border-border relative space-y-4 border-l pl-6">
          {appointment.statusHistory.map((event) => (
            <li key={event.id} className="relative">
              <span className="bg-primary ring-card absolute top-1 -left-[27px] size-3 rounded-full ring-4" />
              <div className="flex items-center justify-between">
                <span className="text-body text-foreground font-semibold">
                  {event.fromStatus ? `${event.fromStatus.replace("_", " ")} → ` : ""}
                  {event.toStatus.replace("_", " ")}
                </span>
                <span className="text-caption text-muted-foreground">
                  {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
              </div>
              <span className="text-caption text-muted-foreground block">
                {event.changedBy ? `${event.changedBy.fullName} (${event.changedBy.role})` : "System"}
              </span>
              {event.reason && <span className="text-caption text-foreground block">{event.reason}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
