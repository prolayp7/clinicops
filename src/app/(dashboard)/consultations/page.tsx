import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { dateToTimeString } from "@/lib/scheduling";
import { listConsultationQueue, listRecentConsultations } from "@/server/services/consultations-service";
import { QueueFilters } from "./_components/queue-filters";
import { startConsultationAction } from "./actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "consultations:view")) {
    redirect("/dashboard");
  }
  const canStart = can(actor.profile.role, "consultations:manage-vitals");

  const params = await searchParams;
  const date = params.date || todayIso();
  const doctorId = params.doctorId || "";

  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const [queue, recent] = await Promise.all([
    listConsultationQueue(actor, { date, doctorId: doctorId || undefined }),
    listRecentConsultations(actor, { doctorId: doctorId || undefined, take: 10 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Consultations</h1>
        <p className="text-muted-foreground text-body">Queue for patients waiting on or in a consultation.</p>
      </div>

      <QueueFilters date={date} doctorId={doctorId} doctors={doctors} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Time</th>
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Doctor</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {queue.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                  No one is waiting on or in a consultation.
                </td>
              </tr>
            )}
            {queue.map((appt) => (
              <tr key={appt.id}>
                <td className="px-4 py-3">{dateToTimeString(appt.startTime)}</td>
                <td className="px-4 py-3">
                  <Link href={`/patients/${appt.patient.id}`} className="text-foreground hover:underline">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </Link>
                  <span className="text-muted-foreground"> · {appt.patient.patientId}</span>
                </td>
                <td className="text-foreground px-4 py-3">{appt.doctor.fullName}</td>
                <td className="px-4 py-3">
                  <span className="text-caption bg-muted rounded px-2 py-1">{appt.status.replace("_", " ")}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {appt.consultation ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/consultations/${appt.consultation.id}`}>Continue</Link>
                    </Button>
                  ) : canStart ? (
                    <form action={startConsultationAction.bind(null, appt.id)}>
                      <Button type="submit" size="sm">
                        Start
                      </Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div>
        <h2 className="text-section-title text-foreground mb-2 font-semibold">Recent consultations</h2>
        <Card className="gap-0 overflow-hidden p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2.5 font-semibold">Patient</th>
                <th className="px-4 py-2.5 font-semibold">Doctor</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-border text-body divide-y">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                    No consultations recorded yet.
                  </td>
                </tr>
              )}
              {recent.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <Link href={`/consultations/${c.id}`} className="text-foreground hover:underline">
                      {c.patient.firstName} {c.patient.lastName}
                    </Link>
                  </td>
                  <td className="text-foreground px-4 py-3">{c.doctor.fullName}</td>
                  <td className="px-4 py-3">
                    <span className="text-caption bg-muted rounded px-2 py-1">{c.status}</span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {c.updatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
