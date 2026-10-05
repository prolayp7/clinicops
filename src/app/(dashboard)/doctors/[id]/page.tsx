import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { getDoctorById } from "@/server/services/doctors-service";
import { listAppointments } from "@/server/services/appointments-service";
import { listRecentConsultations } from "@/server/services/consultations-service";
import { listPrescriptions } from "@/server/services/prescriptions-service";
import { dateToTimeString } from "@/lib/scheduling";
import { deriveAssignedPatients } from "@/lib/doctors";
import { getSignatureSignedUrl } from "@/lib/storage";
import { Role } from "@prisma/client";
import { AppointmentStatusBadge } from "../../appointments/_components/appointment-status-badge";
import { ScheduleEditor } from "./_components/schedule-editor";
import { SignatureUploadForm } from "./_components/signature-upload-form";
import {
  addAvailabilityAction,
  addLeaveAction,
  removeAvailabilityAction,
  removeLeaveAction,
  toggleDoctorStatusAction,
} from "../actions";

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "doctors:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const doctor = await getDoctorById(id);
  if (!doctor) notFound();

  const canManageCore = can(actor.profile.role, "doctors:manage");
  const canManageSchedule =
    can(actor.profile.role, "doctors:manage-availability") &&
    (actor.profile.role !== Role.DOCTOR || doctor.staffProfileId === actor.profile.id);
  const canManageSignature =
    can(actor.profile.role, "doctors:manage-signature") &&
    (actor.profile.role !== Role.DOCTOR || doctor.staffProfileId === actor.profile.id);
  const signatureUrl = doctor.signatureStoragePath
    ? await getSignatureSignedUrl(doctor.signatureStoragePath)
    : null;

  const canViewAppointments = can(actor.profile.role, "appointments:view");
  const canViewPatients = can(actor.profile.role, "patients:view");
  const canViewConsultations = can(actor.profile.role, "consultations:view");
  const canViewPrescriptions = can(actor.profile.role, "prescriptions:view");

  const appointments = canViewAppointments
    ? (await listAppointments(actor, { doctorId: doctor.id, pageSize: 100 })).items
    : [];
  const consultations = canViewConsultations
    ? await listRecentConsultations(actor, { doctorId: doctor.id, take: 100 })
    : [];
  const prescriptions = canViewPrescriptions
    ? (await listPrescriptions(actor, { doctorId: doctor.id, pageSize: 100 })).items
    : [];
  const assignedPatients = canViewPatients ? deriveAssignedPatients(appointments) : [];

  return (
    <div className="space-y-4">
      <Card className="flex-row items-start justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-section-title">
              {initialsOf(doctor.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-page-title text-foreground font-bold">{doctor.fullName}</h1>
              <Badge variant={doctor.status === "ACTIVE" ? "success" : "secondary"}>
                {doctor.status === "ACTIVE" ? "Active" : "Archived"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-body">
              {doctor.specialization.name} • {doctor.department.name}
            </p>
            <p className="text-caption text-muted-foreground">
              License #{doctor.licenseNumber} • {doctor.email} • {doctor.phone}
            </p>
          </div>
        </div>
        {canManageCore && (
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/doctors/${doctor.id}/edit`}>
                <Pencil className="size-4" />
                Edit
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
              <Button type="submit" size="sm" variant={doctor.status === "ACTIVE" ? "destructive" : "secondary"}>
                {doctor.status === "ACTIVE" ? "Archive" : "Unarchive"}
              </Button>
            </form>
          </div>
        )}
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          {canViewAppointments && <TabsTrigger value="appointments">Appointments</TabsTrigger>}
          {canViewPatients && <TabsTrigger value="patients">Patients</TabsTrigger>}
          {canViewConsultations && <TabsTrigger value="consultations">Consultations</TabsTrigger>}
          {canViewPrescriptions && <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <Card className="grid grid-cols-2 gap-4 p-6">
            <Detail label="Qualifications" value={doctor.qualifications.join(", ")} />
            <Detail label="Consultation fee" value={formatCents(doctor.consultationFeeCents)} />
            <Detail label="Default slot duration" value={`${doctor.slotDurationMinutes} minutes`} />
            <Detail label="Department" value={doctor.department.name} />
            <Detail label="Specialization" value={doctor.specialization.name} />
          </Card>

          {(canManageSignature || signatureUrl) && (
            <Card className="mt-4 space-y-3 p-6">
              <h2 className="text-section-title text-foreground font-semibold">
                Prescription signature
              </h2>
              {signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="Doctor signature" className="h-16 object-contain" />
              ) : (
                <p className="text-muted-foreground text-body">
                  No signature uploaded yet. It will appear on issued prescription PDFs once added.
                </p>
              )}
              {canManageSignature && <SignatureUploadForm doctorId={doctor.id} />}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="p-6">
            <ScheduleEditor
              doctorId={doctor.id}
              availability={doctor.availability}
              leaves={doctor.leaves}
              canManage={canManageSchedule}
              onAddAvailability={addAvailabilityAction.bind(null, doctor.id)}
              onRemoveAvailability={removeAvailabilityAction.bind(null, doctor.id)}
              onAddLeave={addLeaveAction.bind(null, doctor.id)}
              onRemoveLeave={removeLeaveAction.bind(null, doctor.id)}
            />
          </Card>
        </TabsContent>

        {canViewAppointments && (
          <TabsContent value="appointments" className="space-y-3">
            <div className="flex justify-end">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/appointments?view=calendar&doctorId=${doctor.id}`}>View calendar</Link>
              </Button>
            </div>
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Date &amp; time</th>
                    <th className="px-4 py-2.5 font-semibold">Patient</th>
                    <th className="px-4 py-2.5 font-semibold">Reason</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                        No appointments for this doctor yet.
                      </td>
                    </tr>
                  )}
                  {appointments.map((appt) => (
                    <tr key={appt.id}>
                      <td className="px-4 py-3">
                        <Link href={`/appointments/${appt.id}`} className="text-foreground hover:underline">
                          {appt.date.toISOString().slice(0, 10)} • {dateToTimeString(appt.startTime)}
                        </Link>
                      </td>
                      <td className="text-foreground px-4 py-3">
                        {appt.patient.firstName} {appt.patient.lastName}
                        <span className="text-muted-foreground"> · {appt.patient.patientId}</span>
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
          </TabsContent>
        )}

        {canViewPatients && (
          <TabsContent value="patients">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Patient</th>
                    <th className="px-4 py-2.5 font-semibold">Phone</th>
                    <th className="px-4 py-2.5 font-semibold">Last visit</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {assignedPatients.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-muted-foreground px-4 py-8 text-center">
                        No assigned patients yet.
                      </td>
                    </tr>
                  )}
                  {assignedPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.id}`} className="text-foreground hover:underline">
                          {patient.firstName} {patient.lastName}
                        </Link>
                        <span className="text-muted-foreground"> · {patient.patientId}</span>
                      </td>
                      <td className="text-foreground px-4 py-3">{patient.phone}</td>
                      <td className="text-muted-foreground px-4 py-3">{patient.lastVisit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )}

        {canViewConsultations && (
          <TabsContent value="consultations">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Patient</th>
                    <th className="px-4 py-2.5 font-semibold">Diagnosis</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {consultations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                        No consultations for this doctor yet.
                      </td>
                    </tr>
                  )}
                  {consultations.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link href={`/consultations/${c.id}`} className="text-foreground hover:underline">
                          {c.createdAt.toISOString().slice(0, 10)}
                        </Link>
                      </td>
                      <td className="text-foreground px-4 py-3">
                        {c.patient.firstName} {c.patient.lastName}
                        <span className="text-muted-foreground"> · {c.patient.patientId}</span>
                      </td>
                      <td className="text-foreground max-w-xs truncate px-4 py-3">{c.diagnosis || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "COMPLETED" ? "success" : "warning"}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )}

        {canViewPrescriptions && (
          <TabsContent value="prescriptions">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Rx #</th>
                    <th className="px-4 py-2.5 font-semibold">Patient</th>
                    <th className="px-4 py-2.5 font-semibold">Medicines</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {prescriptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                        No prescriptions from this doctor yet.
                      </td>
                    </tr>
                  )}
                  {prescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td className="px-4 py-3">
                        <Link href={`/prescriptions/${rx.id}`} className="text-foreground hover:underline">
                          {rx.prescriptionNumber}
                        </Link>
                      </td>
                      <td className="text-foreground px-4 py-3">
                        {rx.patient.firstName} {rx.patient.lastName}
                        <span className="text-muted-foreground"> · {rx.patient.patientId}</span>
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                        {rx.items.map((i) => i.medicine.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rx.status === "ISSUED" ? "success" : "secondary"}>{rx.status}</Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {rx.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-body text-foreground mt-0.5">{value}</div>
    </div>
  );
}
