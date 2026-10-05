import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Download, LayoutGrid, Pencil, Plus, ShieldQuestion, TableProperties } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { listActiveDepartments } from "@/server/services/departments-service";
import { listActiveSpecializations } from "@/server/services/specializations-service";
import { listDoctors } from "@/server/services/doctors-service";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { SLOT_BLOCKING_STATUSES, weekdayFromDateString } from "@/lib/appointments";
import { dateToIsoDateInTimeZone, dateToTimeString } from "@/lib/scheduling";
import {
  computeDoctorDayStatus,
  summarizeDirectory,
  type AvailabilityBlock,
  type DoctorDayStatus,
} from "@/lib/doctor-directory";
import { DoctorFilters } from "./_components/doctor-filters";
import { DoctorDirectoryStats } from "./_components/doctor-directory-stats";
import { DoctorClinicalStatusBadge } from "./_components/doctor-clinical-status-badge";
import { DoctorDepartmentCoverage } from "./_components/doctor-department-coverage";
import { DoctorGridView } from "./_components/doctor-grid-view";
import { toggleDoctorStatusAction } from "./actions";

const PAGE_SIZE = 10;

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "doctors:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "doctors:manage");

  const params = await searchParams;
  const search = params.search ?? "";
  const departmentId = params.department || undefined;
  const specializationId = params.specialization || undefined;
  const status = (params.status as "ACTIVE" | "ARCHIVED" | undefined) || "ACTIVE";
  const page = Math.max(1, Number(params.page) || 1);
  const view = params.view === "grid" ? "grid" : "table";

  const clinicSettings = await getClinicSettings();
  const timezone = clinicSettings?.timezone ?? getEnv().CLINIC_TIMEZONE;
  const todayIso = dateToIsoDateInTimeZone(new Date(), timezone);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);
  const weekday = weekdayFromDateString(todayIso);

  const [{ items, total }, departments, specializations, allActiveDoctors, availabilityRows, leaveRows, todaysAppointments] =
    await Promise.all([
      listDoctors({ search, departmentId, specializationId, status, page, pageSize: PAGE_SIZE }),
      listActiveDepartments(),
      listActiveSpecializations(),
      prisma.doctor.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, departmentId: true, slotDurationMinutes: true },
      }),
      prisma.doctorAvailability.findMany({
        where: { weekday },
        select: { doctorId: true, weekday: true, startTime: true, endTime: true },
      }),
      prisma.doctorLeave.findMany({
        where: { startDate: { lte: todayDate }, endDate: { gte: todayDate } },
        select: { doctorId: true, startDate: true, endDate: true },
      }),
      prisma.appointment.findMany({
        where: { date: todayDate },
        select: { doctorId: true, status: true },
      }),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const availabilityByDoctor = new Map<string, AvailabilityBlock[]>();
  for (const row of availabilityRows) {
    const list = availabilityByDoctor.get(row.doctorId) ?? [];
    list.push({ weekday: row.weekday, startTime: dateToTimeString(row.startTime), endTime: dateToTimeString(row.endTime) });
    availabilityByDoctor.set(row.doctorId, list);
  }

  const leavesByDoctor = new Map<string, { startDate: string; endDate: string }[]>();
  for (const row of leaveRows) {
    const list = leavesByDoctor.get(row.doctorId) ?? [];
    list.push({ startDate: row.startDate.toISOString().slice(0, 10), endDate: row.endDate.toISOString().slice(0, 10) });
    leavesByDoctor.set(row.doctorId, list);
  }

  const appointmentsByDoctor = new Map<string, { booked: number; inConsultation: boolean }>();
  for (const appt of todaysAppointments) {
    if (!SLOT_BLOCKING_STATUSES.includes(appt.status)) continue;
    const entry = appointmentsByDoctor.get(appt.doctorId) ?? { booked: 0, inConsultation: false };
    entry.booked += 1;
    if (appt.status === "IN_CONSULTATION") entry.inConsultation = true;
    appointmentsByDoctor.set(appt.doctorId, entry);
  }

  function statusFor(doctorId: string, slotDurationMinutes: number): DoctorDayStatus {
    return computeDoctorDayStatus({
      weekday,
      today: todayIso,
      availability: availabilityByDoctor.get(doctorId) ?? [],
      leaves: leavesByDoctor.get(doctorId) ?? [],
      slotDurationMinutes,
      bookedAppointmentsToday: appointmentsByDoctor.get(doctorId)?.booked ?? 0,
      hasActiveConsultation: appointmentsByDoctor.get(doctorId)?.inConsultation ?? false,
    });
  }

  const summary = summarizeDirectory(
    allActiveDoctors.map((d) => statusFor(d.id, d.slotDurationMinutes)),
  );

  const departmentCoverage = departments
    .map((dept) => {
      const deptDoctors = allActiveDoctors.filter((d) => d.departmentId === dept.id);
      const onShift = deptDoctors.filter((d) => {
        const s = statusFor(d.id, d.slotDurationMinutes).clinicalStatus;
        return s === "AVAILABLE" || s === "IN_CONSULTATION";
      }).length;
      return { name: dept.name, onShift, total: deptDoctors.length };
    })
    .filter((d) => d.total > 0);

  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page-title text-foreground font-bold">
              Doctors &amp; Clinical Staff Directory
            </h1>
            <Badge variant="outline" className="text-primary border-transparent bg-accent gap-1.5">
              <span className="bg-success size-1.5 animate-pulse rounded-full" />
              {summary.totalDoctors} Active Staffing
            </Badge>
          </div>
          <p className="text-muted-foreground text-body">
            Departments, specializations, weekly availability and today&apos;s status across the
            clinic.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            disabled
            title="CSV export isn't implemented yet — coming in a later phase."
          >
            <Download className="size-4" />
            Export Staff Roster
          </Button>
          {canManage && (
            <Button asChild>
              <Link href="/doctors/new">
                <Plus className="size-4" />
                Onboard Physician
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <DoctorDirectoryStats summary={summary} departmentCount={departments.length} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DoctorFilters
          search={search}
          departmentId={departmentId ?? ""}
          specializationId={specializationId ?? ""}
          status={status}
          departments={departments}
          specializations={specializations}
        />
        <div className="flex items-center gap-3">
          <span className="text-caption text-muted-foreground whitespace-nowrap">
            Showing {items.length} of {total} doctors
          </span>
          <div className="border-border flex overflow-hidden rounded-lg border">
            <Link
              href={{ query: { ...params, view: "table" } }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium",
                view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <TableProperties className="size-3.5" />
              Table
            </Link>
            <Link
              href={{ query: { ...params, view: "grid" } }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium",
                view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutGrid className="size-3.5" />
              Grid
            </Link>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <DoctorGridView
          doctors={items.map((doctor) => ({
            id: doctor.id,
            fullName: doctor.fullName,
            status: doctor.status,
            department: doctor.department,
            specialization: doctor.specialization,
            consultationFeeCents: doctor.consultationFeeCents,
            dayStatus: statusFor(doctor.id, doctor.slotDurationMinutes),
          }))}
        />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2.5 font-semibold">Physician</th>
                <th className="px-4 py-2.5 font-semibold">Department &amp; Specialty</th>
                <th className="px-4 py-2.5 font-semibold">Today&apos;s Shift</th>
                <th className="px-4 py-2.5 font-semibold">Appointment Load</th>
                <th className="px-4 py-2.5 font-semibold">Standard Fee</th>
                <th className="px-4 py-2.5 font-semibold">Clinical Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border text-body divide-y">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                    No doctors match these filters.
                  </td>
                </tr>
              )}
              {items.map((doctor) => {
                const dayStatus = statusFor(doctor.id, doctor.slotDurationMinutes);
                const loadPercent =
                  dayStatus.slotsCapacity > 0
                    ? Math.min(100, Math.round((dayStatus.slotsBooked / dayStatus.slotsCapacity) * 100))
                    : 0;

                return (
                  <tr key={doctor.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-caption">
                            {initialsOf(doctor.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-foreground block leading-tight font-semibold">
                            {doctor.fullName}
                          </span>
                          <span className="text-caption text-muted-foreground">
                            Lic. #{doctor.licenseNumber}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground block">{doctor.department.name}</span>
                      <span className="text-caption text-muted-foreground">
                        {doctor.specialization.name}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-3">{dayStatus.shiftLabel}</td>
                    <td className="px-4 py-3">
                      <div className="text-caption text-foreground mb-1">
                        {dayStatus.slotsBooked}/{dayStatus.slotsCapacity || 0} slots
                      </div>
                      <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            loadPercent >= 90 ? "bg-destructive" : loadPercent >= 60 ? "bg-warning" : "bg-success",
                          )}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-foreground px-4 py-3">{formatCents(doctor.consultationFeeCents)}</td>
                    <td className="px-4 py-3">
                      <DoctorClinicalStatusBadge status={dayStatus.clinicalStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" className="size-8" title="View calendar">
                          <Link href={`/appointments?view=calendar&doctorId=${doctor.id}`}>
                            <CalendarClock className="size-4" />
                          </Link>
                        </Button>
                        {canManage && (
                          <>
                            <Button asChild size="icon" variant="ghost" className="size-8" title="Edit doctor">
                              <Link href={`/doctors/${doctor.id}/edit`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <form
                              action={async () => {
                                "use server";
                                await toggleDoctorStatusAction(
                                  doctor.id,
                                  doctor.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                                );
                              }}
                            >
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-caption"
                              >
                                {doctor.status === "ACTIVE" ? "Archive" : "Unarchive"}
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="text-caption text-muted-foreground flex items-center justify-between">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-1.5">
            {page <= 1 ? (
              <Button size="sm" variant="secondary" disabled>
                Previous
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={{ query: { ...params, page: String(page - 1) } }}>Previous</Link>
              </Button>
            )}
            {page >= totalPages ? (
              <Button size="sm" variant="secondary" disabled>
                Next
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={{ query: { ...params, page: String(page + 1) } }}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DoctorDepartmentCoverage coverage={departmentCoverage} />
        </div>
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="text-muted-foreground size-4" />
            <h2 className="text-section-title text-foreground font-semibold">
              Credentialing watch
            </h2>
          </div>
          <p className="text-muted-foreground text-body">
            License-expiry tracking isn&apos;t built yet, so there&apos;s nothing to alert on here.
            Add an expiry date to doctor licenses in a later phase to enable this.
          </p>
        </Card>
      </div>
    </div>
  );
}
