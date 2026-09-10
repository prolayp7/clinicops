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
import { getSignatureSignedUrl } from "@/lib/storage";
import { Role } from "@prisma/client";
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
