"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ClinicalFields } from "../../_components/clinical-fields";
import type { Patient } from "@prisma/client";
import type { FormState } from "../../actions";

export function ClinicalEditor({
  patient,
  canEdit,
  action,
}: {
  patient: Patient;
  canEdit: boolean;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <ReadOnlyList label="Allergies" items={patient.allergies} />
        <ReadOnlyList label="Previous diagnoses" items={patient.previousDiagnoses} />
        <ReadOnlyList label="Current medications" items={patient.currentMedications} />
        <div>
          <div className="text-caption text-muted-foreground uppercase tracking-wider">
            Medical history notes
          </div>
          <p className="text-body text-foreground mt-1 whitespace-pre-wrap">
            {patient.medicalHistory || "—"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <ClinicalFields initial={patient} />
      {state.error && <p className="text-destructive text-body">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save medical history"}
      </Button>
    </form>
  );
}

function ReadOnlyList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-caption text-muted-foreground uppercase tracking-wider">{label}</div>
      <p className="text-body text-foreground mt-1">{items.length > 0 ? items.join(", ") : "—"}</p>
    </div>
  );
}
