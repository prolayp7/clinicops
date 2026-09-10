"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPrescriptionAction, type FormState } from "../actions";

type PatientOption = { id: string; patientId: string; firstName: string; lastName: string };
type DoctorOption = { id: string; fullName: string; specialization: { name: string } };

export function NewPrescriptionForm({
  patients,
  doctors,
  defaultPatientId,
  defaultDoctorId,
  consultationId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  defaultPatientId?: string;
  defaultDoctorId?: string;
  consultationId?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPrescriptionAction, {
    error: null,
  });
  const v = state.values;

  return (
    <form action={formAction} key={JSON.stringify(v)} className="space-y-4">
      <input type="hidden" name="consultationId" value={consultationId ?? ""} />

      <div className="space-y-1.5">
        <Label htmlFor="patientId">Patient</Label>
        <Select name="patientId" defaultValue={v?.patientId ?? defaultPatientId} required>
          <SelectTrigger id="patientId" className="w-full">
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName} — #{p.patientId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doctorId">Doctor</Label>
        <Select name="doctorId" defaultValue={v?.doctorId ?? defaultDoctorId} required>
          <SelectTrigger id="doctorId" className="w-full">
            <SelectValue placeholder="Select a doctor" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.fullName} — {d.specialization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Instructions to patient / pharmacist (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={v?.notes} />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Draft"}
      </Button>
    </form>
  );
}
