import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { MEAL_INSTRUCTION_LABELS, canIssuePrescription } from "@/lib/prescriptions";
import { getPrescriptionById } from "@/server/services/prescriptions-service";
import { listActiveMedicines } from "@/server/services/medicines-service";
import { AddItemForm } from "./_components/add-item-form";
import { IssueButton } from "./_components/issue-button";
import { removeItemAction } from "../actions";

export default async function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "prescriptions:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const prescription = await getPrescriptionById(actor, id);
  if (!prescription) notFound();

  const isBlockedDoctor =
    actor.profile.role === "DOCTOR" && prescription.doctor.staffProfileId !== actor.profile.id;
  const canManage = can(actor.profile.role, "prescriptions:manage") && !isBlockedDoctor;
  const isDraft = prescription.status === "DRAFT";
  const medicines = isDraft && canManage ? await listActiveMedicines() : [];

  return (
    <div className="space-y-4">
      <Card className="space-y-1 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title text-foreground font-bold">{prescription.prescriptionNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={prescription.status === "ISSUED" ? "success" : "secondary"}>
              {prescription.status}
            </Badge>
            {prescription.status === "ISSUED" && (
              <Button asChild size="sm" variant="secondary">
                <a href={`/api/prescriptions/${prescription.id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-body">
          <Link href={`/patients/${prescription.patient.id}`} className="hover:underline">
            {prescription.patient.firstName} {prescription.patient.lastName}
          </Link>{" "}
          · #{prescription.patient.patientId} · with{" "}
          <Link href={`/doctors/${prescription.doctor.id}`} className="hover:underline">
            {prescription.doctor.fullName}
          </Link>
        </p>
        <p className="text-caption text-muted-foreground">
          Created {prescription.createdAt.toISOString().slice(0, 10)}
          {prescription.issuedAt ? ` • Issued ${prescription.issuedAt.toISOString().slice(0, 10)}` : ""}
          {prescription.consultation ? " • Linked to a consultation" : ""}
        </p>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Medicines</h2>
        {prescription.items.length === 0 ? (
          <p className="text-muted-foreground text-body">No medicines added yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {prescription.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-body text-foreground font-semibold">
                    {item.medicine.name} {item.medicine.strength} ({item.medicine.form})
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {item.dosage} • {item.frequency} • {item.route} • {item.duration} •{" "}
                    {MEAL_INSTRUCTION_LABELS[item.mealInstruction]}
                  </p>
                  {item.directions && (
                    <p className="text-caption text-foreground mt-0.5 italic">{item.directions}</p>
                  )}
                </div>
                {isDraft && canManage && (
                  <form action={removeItemAction.bind(null, prescription.id, item.id)}>
                    <Button type="submit" size="icon-sm" variant="ghost" aria-label="Remove medicine">
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {isDraft && canManage && (
          <div className="border-border border-t pt-4">
            <AddItemForm prescriptionId={prescription.id} medicines={medicines} />
          </div>
        )}
      </Card>

      {prescription.notes && (
        <Card className="p-6">
          <h2 className="text-section-title text-foreground mb-2 font-semibold">
            Instructions to patient / pharmacist
          </h2>
          <p className="text-body text-foreground">{prescription.notes}</p>
        </Card>
      )}

      {isDraft && canManage && (
        <div>
          {canIssuePrescription(prescription.status, prescription.items.length) ? (
            <IssueButton prescriptionId={prescription.id} />
          ) : (
            <p className="text-caption text-muted-foreground">
              Add at least one medicine before issuing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
