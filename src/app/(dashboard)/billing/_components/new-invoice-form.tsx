"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvoiceAction, type FormState } from "../actions";

type PatientOption = { id: string; patientId: string; firstName: string; lastName: string };

export function NewInvoiceForm({
  patients,
  defaultPatientId,
}: {
  patients: PatientOption[];
  defaultPatientId?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createInvoiceAction, {
    error: null,
  });
  const v = state.values;

  return (
    <form action={formAction} key={JSON.stringify(v)} className="space-y-4">
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
        <Label htmlFor="dueDate">Due date (optional)</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={v?.dueDate} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={v?.notes} />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Invoice"}
      </Button>
    </form>
  );
}
