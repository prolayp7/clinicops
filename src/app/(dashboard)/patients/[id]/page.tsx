import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pencil, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { calculateAge } from "@/lib/patients";
import { getPatientById, getPatientTimeline } from "@/server/services/patients-service";
import { listAppointments } from "@/server/services/appointments-service";
import { listRecentConsultations } from "@/server/services/consultations-service";
import { listPrescriptions } from "@/server/services/prescriptions-service";
import { listLabOrders } from "@/server/services/lab-orders-service";
import { listInvoices } from "@/server/services/invoices-service";
import { listDocuments } from "@/server/services/documents-service";
import { listActiveDocumentCategories } from "@/server/services/document-categories-service";
import { getPortalAccountForPatient } from "@/server/services/patient-accounts-service";
import { formatCents } from "@/lib/billing";
import { dateToTimeString } from "@/lib/scheduling";
import { AppointmentStatusBadge } from "../../appointments/_components/appointment-status-badge";
import { LabOrderStatusBadge } from "../../laboratory/_components/lab-order-status-badge";
import { InvoiceStatusBadge } from "../../billing/_components/invoice-status-badge";
import { ClinicalEditor } from "./_components/clinical-editor";
import { DocumentUploadForm } from "./_components/document-upload-form";
import { PortalAccessCard } from "./_components/portal-access-card";
import { togglePatientStatusAction, updateClinicalAction } from "../actions";
import { toggleDocumentStatusAction } from "../../documents/actions";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "patient.viewed": "Profile viewed",
  "patient.created": "Patient registered",
  "patient.updated": "Demographics updated",
  "patient.clinical_updated": "Medical history updated",
  "patient.archived": "Patient archived",
  "patient.unarchived": "Patient reactivated",
};

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "patients:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const patient = await getPatientById(actor, id);
  if (!patient) notFound();

  const canManageCore = can(actor.profile.role, "patients:manage");
  const canManageClinical = can(actor.profile.role, "patients:manage-clinical");
  const canViewAppointments = can(actor.profile.role, "appointments:view");
  const canViewConsultations = can(actor.profile.role, "consultations:view");
  const canViewPrescriptions = can(actor.profile.role, "prescriptions:view");
  const canViewLabOrders = can(actor.profile.role, "laboratory:view");
  const canViewInvoices = can(actor.profile.role, "billing:view");
  const canViewDocuments = can(actor.profile.role, "documents:view");
  const canManageDocuments = can(actor.profile.role, "documents:manage");
  const canManagePortalAccess = can(actor.profile.role, "patients:manage-portal-access");
  const timeline = can(actor.profile.role, "audit-logs:view") ? await getPatientTimeline(actor, id) : [];
  const appointments = canViewAppointments
    ? (await listAppointments(actor, { patientId: id, pageSize: 100 })).items
    : [];
  const consultations = canViewConsultations
    ? await listRecentConsultations(actor, { patientId: id, take: 100 })
    : [];
  const prescriptions = canViewPrescriptions
    ? (await listPrescriptions(actor, { patientId: id, pageSize: 100 })).items
    : [];
  const labOrders = canViewLabOrders
    ? (await listLabOrders(actor, { patientId: id, pageSize: 100 })).items
    : [];
  const invoices = canViewInvoices
    ? (await listInvoices(actor, { patientId: id, pageSize: 100 })).items
    : [];
  const documents = canViewDocuments
    ? (await listDocuments(actor, { patientId: id, pageSize: 100 })).items
    : [];
  const documentCategories = canManageDocuments ? await listActiveDocumentCategories() : [];
  const portalAccount = canManagePortalAccess ? await getPortalAccountForPatient(id) : null;

  return (
    <div className="space-y-4">
      <Card className="flex-row items-start justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-section-title">
              {initialsOf(patient.firstName, patient.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-page-title text-foreground font-bold">
                {patient.firstName} {patient.lastName}
              </h1>
              <Badge variant={patient.status === "ACTIVE" ? "success" : "secondary"}>
                {patient.status === "ACTIVE" ? "Active" : "Archived"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-body">
              #{patient.patientId} • {calculateAge(patient.dateOfBirth)}y • {patient.sex} • DOB{" "}
              {patient.dateOfBirth.toISOString().slice(0, 10)}
            </p>
            <p className="text-caption text-muted-foreground">
              {patient.phone}
              {patient.email ? ` • ${patient.email}` : ""}
            </p>
            {patient.allergies.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <TriangleAlert className="text-destructive size-3.5" />
                {patient.allergies.map((a) => (
                  <Badge key={a} variant="destructive">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {canManageCore && (
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/patients/${patient.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <form
              action={async () => {
                "use server";
                await togglePatientStatusAction(
                  patient.id,
                  patient.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                );
              }}
            >
              <Button
                type="submit"
                size="sm"
                variant={patient.status === "ACTIVE" ? "destructive" : "secondary"}
              >
                {patient.status === "ACTIVE" ? "Archive" : "Unarchive"}
              </Button>
            </form>
          </div>
        )}
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="medical-history">Medical History</TabsTrigger>
          {canViewAppointments && <TabsTrigger value="appointments">Appointments</TabsTrigger>}
          {canViewConsultations && <TabsTrigger value="consultations">Consultations</TabsTrigger>}
          {canViewPrescriptions && <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>}
          {canViewLabOrders && <TabsTrigger value="laboratory">Laboratory</TabsTrigger>}
          {canViewInvoices && <TabsTrigger value="billing">Billing</TabsTrigger>}
          {canViewDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <Card className="grid grid-cols-2 gap-4 p-6">
            <Detail label="Address" value={formatAddress(patient)} />
            <Detail
              label="Emergency contact"
              value={
                patient.emergencyContactName
                  ? `${patient.emergencyContactName} (${patient.emergencyContactRelationship || "—"}) • ${patient.emergencyContactPhone || "—"}`
                  : "—"
              }
            />
          </Card>

          {canManagePortalAccess && (
            <PortalAccessCard patientId={patient.id} patientEmail={patient.email} account={portalAccount} />
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="p-6">
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-body">No activity recorded yet.</p>
            ) : (
              <ol className="border-border relative space-y-4 border-l pl-6">
                {timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="bg-primary ring-card absolute top-1 -left-[27px] size-3 rounded-full ring-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-body text-foreground font-semibold">
                        {AUDIT_ACTION_LABELS[event.action] ?? event.action}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                      </span>
                    </div>
                    <span className="text-caption text-muted-foreground">
                      {event.actor ? `${event.actor.fullName} (${event.actor.role})` : "System"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="medical-history">
          <Card className="p-6">
            <ClinicalEditor
              patient={patient}
              canEdit={canManageClinical}
              action={updateClinicalAction.bind(null, patient.id)}
            />
          </Card>
        </TabsContent>

        {canViewAppointments && (
          <TabsContent value="appointments">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Date &amp; time</th>
                    <th className="px-4 py-2.5 font-semibold">Doctor</th>
                    <th className="px-4 py-2.5 font-semibold">Reason</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                        No appointments yet.
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
                      <td className="text-foreground px-4 py-3">{appt.doctor.fullName}</td>
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

        {canViewConsultations && (
          <TabsContent value="consultations">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Doctor</th>
                    <th className="px-4 py-2.5 font-semibold">Diagnosis</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {consultations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                        No consultations yet.
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
                      <td className="text-foreground px-4 py-3">{c.doctor.fullName}</td>
                      <td className="text-foreground max-w-xs truncate px-4 py-3">
                        {c.diagnosis || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "COMPLETED" ? "success" : "warning"}>
                          {c.status}
                        </Badge>
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
                    <th className="px-4 py-2.5 font-semibold">Doctor</th>
                    <th className="px-4 py-2.5 font-semibold">Medicines</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {prescriptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                        No prescriptions yet.
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
                      <td className="text-foreground px-4 py-3">{rx.doctor.fullName}</td>
                      <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                        {rx.items.map((i) => i.medicine.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rx.status === "ISSUED" ? "success" : "secondary"}>
                          {rx.status}
                        </Badge>
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

        {canViewLabOrders && (
          <TabsContent value="laboratory">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Order #</th>
                    <th className="px-4 py-2.5 font-semibold">Tests</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {labOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                        No lab orders yet.
                      </td>
                    </tr>
                  )}
                  {labOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <Link href={`/laboratory/${order.id}`} className="text-foreground hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                        {order.items.map((i) => i.labTest.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <LabOrderStatusBadge status={order.status} />
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {order.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )}

        {canViewInvoices && (
          <TabsContent value="billing">
            <Card className="gap-0 overflow-hidden p-0">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-semibold">Invoice #</th>
                    <th className="px-4 py-2.5 font-semibold">Total</th>
                    <th className="px-4 py-2.5 font-semibold">Paid</th>
                    <th className="px-4 py-2.5 font-semibold">Balance</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-border text-body divide-y">
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3">
                        <Link href={`/billing/${invoice.id}`} className="text-foreground hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-foreground px-4 py-3">{formatCents(invoice.totalCents)}</td>
                      <td className="text-foreground px-4 py-3">{formatCents(invoice.paidCents)}</td>
                      <td className="text-foreground px-4 py-3">
                        {formatCents(invoice.totalCents - invoice.paidCents)}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {invoice.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        )}

        {canViewDocuments && (
          <TabsContent value="documents">
            <Card className="space-y-3 p-6">
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-body">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-border divide-y">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2.5">
                      <div>
                        {doc.signedUrl ? (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-foreground text-body hover:underline"
                          >
                            {doc.fileName}
                          </a>
                        ) : (
                          <span className="text-body text-foreground">{doc.fileName}</span>
                        )}
                        <p className="text-caption text-muted-foreground">
                          {doc.category.name} • {doc.createdAt.toISOString().slice(0, 10)} by{" "}
                          {doc.uploadedBy.fullName}
                        </p>
                      </div>
                      {canManageDocuments && (
                        <form
                          action={toggleDocumentStatusAction.bind(
                            null,
                            doc.id,
                            patient.id,
                            doc.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                          )}
                        >
                          <Button type="submit" size="sm" variant="secondary">
                            {doc.status === "ACTIVE" ? "Archive" : "Unarchive"}
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canManageDocuments && (
                <div className="border-border border-t pt-4">
                  <DocumentUploadForm patientId={patient.id} categories={documentCategories} />
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function formatAddress(patient: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}) {
  const parts = [
    patient.addressLine1,
    patient.addressLine2,
    [patient.city, patient.state, patient.postalCode].filter(Boolean).join(", "),
    patient.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-body text-foreground mt-0.5">{value}</div>
    </div>
  );
}
