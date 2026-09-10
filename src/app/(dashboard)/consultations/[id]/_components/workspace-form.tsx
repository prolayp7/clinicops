"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { ConsultationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  amendConsultationAction,
  completeConsultationAction,
  saveDraftAction,
  type FormState,
} from "../../actions";

type ConsultationValues = {
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  pulseBpm: number | null;
  temperatureCelsius: number | null;
  respiratoryRate: number | null;
  oxygenSaturationPercent: number | null;
  heightCm: number | null;
  weightKg: number | null;
  symptoms: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
};

const INITIAL_STATE: FormState = { error: null };

function toInputValue(v: number | string | null | undefined) {
  return v === null || v === undefined ? "" : String(v);
}

/** Warns before an in-app navigation or tab close while the form has unsaved edits. Doesn't catch
 * the browser back/forward buttons or a programmatic router.push — acceptable MVP ceiling. */
function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);
}

export function WorkspaceForm({
  consultationId,
  status,
  values,
  updatedAt,
  canEditVitals,
  canEditClinical,
}: {
  consultationId: string;
  status: ConsultationStatus;
  values: ConsultationValues;
  updatedAt: string;
  canEditVitals: boolean;
  canEditClinical: boolean;
}) {
  const [draftState, draftAction] = useActionState(
    saveDraftAction.bind(null, consultationId),
    INITIAL_STATE,
  );
  const [completeState, completeActionFn, completePending] = useActionState(
    completeConsultationAction.bind(null, consultationId),
    INITIAL_STATE,
  );
  const [amendState, amendActionFn, amendPending] = useActionState(
    amendConsultationAction.bind(null, consultationId),
    INITIAL_STATE,
  );

  const [isAmending, setIsAmending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<"draft" | "complete">("draft");
  const formRef = useRef<HTMLFormElement>(null);
  const initialSnapshot = useRef<string | null>(null);

  useUnsavedChangesWarning(dirty);

  // The form remounts (fresh `defaultValue`s) whenever `formKey` changes — after a successful
  // save (new `updatedAt`) or on entering/leaving amend mode. Reset the dirty flag right here
  // during render (React's documented "adjust state during rendering" pattern) rather than in
  // an effect, so it takes effect in the same commit as the remount.
  const formKey = `${updatedAt}-${isAmending}`;
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    setDirty(false);
  }

  useEffect(() => {
    if (formRef.current) {
      initialSnapshot.current = JSON.stringify(Object.fromEntries(new FormData(formRef.current)));
    }
  }, [formKey]);

  function handleChange() {
    if (!formRef.current || initialSnapshot.current === null) return;
    const current = JSON.stringify(Object.fromEntries(new FormData(formRef.current)));
    setDirty(current !== initialSnapshot.current);
  }

  const activeState = isAmending ? amendState : lastSubmitted === "complete" ? completeState : draftState;
  const v = activeState.values;
  const isEditable = status === "DRAFT" || isAmending;
  const formAction = isAmending ? amendActionFn : draftAction;

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={handleChange}
      key={formKey}
      className="space-y-6"
    >
      {isAmending && (
        <div className="border-warning bg-warning/5 space-y-1.5 rounded-lg border p-4">
          <Label htmlFor="reason">Reason for amendment</Label>
          <Textarea id="reason" name="reason" rows={2} required defaultValue={v?.reason} />
          <p className="text-caption text-muted-foreground">
            Explain why this completed record is being changed. This is recorded permanently.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-section-title text-foreground font-semibold">Vitals</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <VitalField
            label="BP systolic"
            unit="mmHg"
            name="bloodPressureSystolic"
            defaultValue={v?.bloodPressureSystolic ?? toInputValue(values.bloodPressureSystolic)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="BP diastolic"
            unit="mmHg"
            name="bloodPressureDiastolic"
            defaultValue={v?.bloodPressureDiastolic ?? toInputValue(values.bloodPressureDiastolic)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="Pulse"
            unit="bpm"
            name="pulseBpm"
            defaultValue={v?.pulseBpm ?? toInputValue(values.pulseBpm)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="Temperature"
            unit="°C"
            name="temperatureCelsius"
            step="0.1"
            defaultValue={v?.temperatureCelsius ?? toInputValue(values.temperatureCelsius)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="Resp. rate"
            unit="/min"
            name="respiratoryRate"
            defaultValue={v?.respiratoryRate ?? toInputValue(values.respiratoryRate)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="SpO2"
            unit="%"
            name="oxygenSaturationPercent"
            defaultValue={v?.oxygenSaturationPercent ?? toInputValue(values.oxygenSaturationPercent)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="Height"
            unit="cm"
            name="heightCm"
            step="0.1"
            defaultValue={v?.heightCm ?? toInputValue(values.heightCm)}
            disabled={!isEditable || !canEditVitals}
          />
          <VitalField
            label="Weight"
            unit="kg"
            name="weightKg"
            step="0.1"
            defaultValue={v?.weightKg ?? toInputValue(values.weightKg)}
            disabled={!isEditable || !canEditVitals}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-section-title text-foreground font-semibold">Symptoms &amp; diagnosis</h2>
        <div className="space-y-1.5">
          <Label htmlFor="symptoms">Symptoms</Label>
          <Textarea
            id="symptoms"
            name="symptoms"
            rows={2}
            defaultValue={v?.symptoms ?? values.symptoms ?? ""}
            disabled={!isEditable || !canEditClinical}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Textarea
            id="diagnosis"
            name="diagnosis"
            rows={2}
            defaultValue={v?.diagnosis ?? values.diagnosis ?? ""}
            disabled={!isEditable || !canEditClinical}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-section-title text-foreground font-semibold">Clinical notes &amp; plan</h2>
        <div className="space-y-1.5">
          <Label htmlFor="clinicalNotes">Clinical notes</Label>
          <Textarea
            id="clinicalNotes"
            name="clinicalNotes"
            rows={4}
            defaultValue={v?.clinicalNotes ?? values.clinicalNotes ?? ""}
            disabled={!isEditable || !canEditClinical}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="treatmentPlan">Treatment plan</Label>
          <Textarea
            id="treatmentPlan"
            name="treatmentPlan"
            rows={3}
            defaultValue={v?.treatmentPlan ?? values.treatmentPlan ?? ""}
            disabled={!isEditable || !canEditClinical}
          />
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="followUpDate">Follow-up date</Label>
          <Input
            id="followUpDate"
            name="followUpDate"
            type="date"
            defaultValue={v?.followUpDate ?? values.followUpDate ?? ""}
            disabled={!isEditable || !canEditClinical}
          />
        </div>
      </section>

      {activeState.error && (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3">
          <AlertTriangle className="text-destructive size-4 shrink-0" />
          <p className="text-destructive text-body">{activeState.error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" && (canEditVitals || canEditClinical) && (
          <Button type="submit" variant="secondary" onClick={() => setLastSubmitted("draft")}>
            Save Draft
          </Button>
        )}
        {status === "DRAFT" && canEditClinical && (
          <Button
            type="submit"
            formAction={completeActionFn}
            disabled={completePending}
            onClick={() => setLastSubmitted("complete")}
          >
            {completePending ? "Completing…" : "Complete Consultation"}
          </Button>
        )}
        {status === "COMPLETED" && !isAmending && canEditClinical && (
          <Button type="button" variant="secondary" onClick={() => setIsAmending(true)}>
            Amend
          </Button>
        )}
        {isAmending && (
          <>
            <Button type="submit" disabled={amendPending}>
              {amendPending ? "Saving…" : "Save Amendment"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsAmending(false)}>
              Cancel
            </Button>
          </>
        )}
        {status === "COMPLETED" && !isAmending && !canEditClinical && (
          <p className="text-muted-foreground text-body">This consultation is completed.</p>
        )}
      </div>
    </form>
  );
}

function VitalField({
  label,
  unit,
  name,
  defaultValue,
  disabled,
  step,
}: {
  label: string;
  unit: string;
  name: string;
  defaultValue: string;
  disabled: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label} <span className="text-muted-foreground">({unit})</span>
      </Label>
      <Input id={name} name={name} type="number" step={step} defaultValue={defaultValue} disabled={disabled} />
    </div>
  );
}
