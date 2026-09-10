import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { dateToTimeString } from "@/lib/scheduling";
import { getConsultationById, listRecentConsultations } from "@/server/services/consultations-service";
import { getPrescriptionByConsultationId } from "@/server/services/prescriptions-service";
import { listLabOrders } from "@/server/services/lab-orders-service";
import { LabOrderStatusBadge } from "../../laboratory/_components/lab-order-status-badge";
import { WorkspaceForm } from "./_components/workspace-form";
import { AttachmentUploadForm } from "./_components/attachment-upload-form";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ConsultationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "consultations:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const consultation = await getConsultationById(actor, id);
  if (!consultation) notFound();

  const isBlockedDoctor =
    actor.profile.role === "DOCTOR" && consultation.doctor.staffProfileId !== actor.profile.id;
  const canEditVitals = can(actor.profile.role, "consultations:manage-vitals") && !isBlockedDoctor;
  const canEditClinical = can(actor.profile.role, "consultations:manage-clinical") && !isBlockedDoctor;
  const canUpload = canEditVitals;
  const canManagePrescriptions = can(actor.profile.role, "prescriptions:manage") && !isBlockedDoctor;
  const canOrderLabTests = can(actor.profile.role, "laboratory:manage-orders") && !isBlockedDoctor;

  const prescription = can(actor.profile.role, "prescriptions:view")
    ? await getPrescriptionByConsultationId(actor, consultation.id)
    : null;
  const labOrders = can(actor.profile.role, "laboratory:view")
    ? (await listLabOrders(actor, { consultationId: consultation.id })).items
    : [];

  const recent = (
    await listRecentConsultations(actor, { patientId: consultation.patient.id, take: 4 })
  ).filter((c) => c.id !== consultation.id);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="space-y-1 p-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/patients/${consultation.patient.id}`}
              className="text-page-title text-foreground font-bold hover:underline"
            >
              {consultation.patient.firstName} {consultation.patient.lastName}
            </Link>
            <Badge variant={consultation.status === "COMPLETED" ? "success" : "warning"}>
              {consultation.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-body">
            #{consultation.patient.patientId} • with {consultation.doctor.fullName} •{" "}
            {consultation.appointment.date.toISOString().slice(0, 10)} •{" "}
            {dateToTimeString(consultation.appointment.startTime)}
          </p>
          <p className="text-caption text-muted-foreground">Reason: {consultation.appointment.reason}</p>
          {consultation.patient.allergies.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <TriangleAlert className="text-destructive size-3.5" />
              {consultation.patient.allergies.map((a) => (
                <Badge key={a} variant="destructive">
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <WorkspaceForm
            consultationId={consultation.id}
            status={consultation.status}
            updatedAt={consultation.updatedAt.toISOString()}
            canEditVitals={canEditVitals}
            canEditClinical={canEditClinical}
            values={{
              bloodPressureSystolic: consultation.bloodPressureSystolic,
              bloodPressureDiastolic: consultation.bloodPressureDiastolic,
              pulseBpm: consultation.pulseBpm,
              temperatureCelsius: consultation.temperatureCelsius,
              respiratoryRate: consultation.respiratoryRate,
              oxygenSaturationPercent: consultation.oxygenSaturationPercent,
              heightCm: consultation.heightCm,
              weightKg: consultation.weightKg,
              symptoms: consultation.symptoms,
              diagnosis: consultation.diagnosis,
              clinicalNotes: consultation.clinicalNotes,
              treatmentPlan: consultation.treatmentPlan,
              followUpDate: consultation.followUpDate ? consultation.followUpDate.toISOString().slice(0, 10) : null,
            }}
          />
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="text-section-title text-foreground font-semibold">Attachments</h2>
          {consultation.attachments.length === 0 ? (
            <p className="text-muted-foreground text-body">No attachments yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {consultation.attachments.map((a) => (
                <li key={a.id} className="text-body flex items-center justify-between">
                  {a.signedUrl ? (
                    <a href={a.signedUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                      {a.fileName}
                    </a>
                  ) : (
                    <span>{a.fileName}</span>
                  )}
                  <span className="text-caption text-muted-foreground">
                    {formatBytes(a.sizeBytes)} • {a.uploadedBy.fullName}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canUpload && <AttachmentUploadForm consultationId={consultation.id} />}
        </Card>

        {can(actor.profile.role, "prescriptions:view") && (
          <Card className="space-y-3 p-6">
            <h2 className="text-section-title text-foreground font-semibold">Prescription</h2>
            {prescription ? (
              <div className="flex items-center justify-between">
                <Link href={`/prescriptions/${prescription.id}`} className="text-foreground hover:underline">
                  {prescription.prescriptionNumber}
                </Link>
                <Badge variant={prescription.status === "ISSUED" ? "success" : "secondary"}>
                  {prescription.status}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground text-body">No prescription written for this visit yet.</p>
            )}
            {!prescription && canManagePrescriptions && (
              <Button asChild size="sm" variant="secondary">
                <Link
                  href={`/prescriptions/new?patientId=${consultation.patient.id}&doctorId=${consultation.doctor.id}&consultationId=${consultation.id}`}
                >
                  <Plus className="size-4" />
                  New Prescription
                </Link>
              </Button>
            )}
          </Card>
        )}

        {can(actor.profile.role, "laboratory:view") && (
          <Card className="space-y-3 p-6">
            <h2 className="text-section-title text-foreground font-semibold">Lab Orders</h2>
            {labOrders.length === 0 ? (
              <p className="text-muted-foreground text-body">No lab tests ordered for this visit yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {labOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between py-2">
                    <Link href={`/laboratory/${order.id}`} className="text-foreground hover:underline">
                      {order.orderNumber}
                    </Link>
                    <LabOrderStatusBadge status={order.status} />
                  </li>
                ))}
              </ul>
            )}
            {canOrderLabTests && (
              <Button asChild size="sm" variant="secondary">
                <Link
                  href={`/laboratory/new?patientId=${consultation.patient.id}&consultationId=${consultation.id}`}
                >
                  <Plus className="size-4" />
                  New Lab Order
                </Link>
              </Button>
            )}
          </Card>
        )}

        {consultation.amendments.length > 0 && (
          <Card className="space-y-3 p-6">
            <h2 className="text-section-title text-foreground font-semibold">Amendment history</h2>
            <ol className="border-border relative space-y-4 border-l pl-6">
              {consultation.amendments.map((a) => (
                <li key={a.id} className="relative">
                  <span className="bg-primary ring-card absolute top-1 -left-[27px] size-3 rounded-full ring-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-body text-foreground font-semibold">
                      {a.amendedBy.fullName} ({a.amendedBy.role})
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                    </span>
                  </div>
                  <p className="text-body text-foreground">{a.reason}</p>
                  <p className="text-caption text-muted-foreground">
                    Changed: {a.changedFields.join(", ")}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="space-y-2 p-4">
          <h2 className="text-body text-foreground font-semibold">Current medications</h2>
          {consultation.patient.currentMedications.length === 0 ? (
            <p className="text-caption text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="text-caption space-y-1">
              {consultation.patient.currentMedications.map((m) => (
                <li key={m} className="text-foreground">
                  {m}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <h2 className="text-body text-foreground font-semibold">Recent consultations</h2>
          {recent.length === 0 ? (
            <p className="text-caption text-muted-foreground">No earlier visits.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/consultations/${c.id}`} className="text-caption text-foreground hover:underline">
                    {c.createdAt.toISOString().slice(0, 10)} — {c.diagnosis || "No diagnosis recorded"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
