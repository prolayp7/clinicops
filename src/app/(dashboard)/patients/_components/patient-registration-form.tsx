"use client";

import { useActionState, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemographicsFields } from "./demographics-fields";
import { ClinicalFields } from "./clinical-fields";
import { createPatientAction, type FormState } from "../actions";

export function PatientRegistrationForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPatientAction, {
    error: null,
  });
  const [force, setForce] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function registerAnyway() {
    setForce(true);
    // Re-submit on next tick so the hidden "force" input picks up the new value first.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="force" value={force ? "true" : "false"} />

      {/* Keyed on the resubmitted values so every field — including custom components like the
          Sex select, which React's native-input form-reset doesn't reach — remounts and picks
          up what the user actually typed, instead of only the plain <input>s restoring. */}
      <Card className="p-6">
        <h2 className="text-section-title text-foreground mb-4 font-semibold">Demographics</h2>
        <DemographicsFields key={JSON.stringify(state.values)} values={state.values} />
      </Card>

      <Card className="p-6">
        <h2 className="text-section-title text-foreground mb-4 font-semibold">Medical history</h2>
        <ClinicalFields key={JSON.stringify(state.values)} values={state.values} />
      </Card>

      {state.duplicates && state.duplicates.length > 0 && (
        <Card className="border-warning bg-warning/5 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="text-warning size-5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-body text-foreground font-semibold">
                Possible duplicate patients found
              </p>
              <ul className="text-body text-muted-foreground space-y-1">
                {state.duplicates.map((d) => (
                  <li key={d.id}>
                    {d.firstName} {d.lastName} — #{d.patientId} — {d.phone}
                    {d.email ? ` — ${d.email}` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-caption text-muted-foreground">
                This does not automatically merge records. Confirm this is a new, distinct patient
                before continuing.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={registerAnyway}>
                Register as new patient anyway
              </Button>
            </div>
          </div>
        </Card>
      )}

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Registering…" : "Register patient"}
      </Button>
    </form>
  );
}
