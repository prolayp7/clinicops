"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DemographicsFields } from "../../_components/demographics-fields";
import { updateDemographicsAction, type FormState } from "../../actions";
import type { Patient } from "@prisma/client";

export function EditForm({ patientId, initial }: { patientId: string; initial: Patient }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateDemographicsAction.bind(null, patientId),
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <DemographicsFields initial={initial} />
      {state.error && <p className="text-destructive text-body">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
