"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLabOrderAction, type FormState } from "../actions";

type PatientOption = { id: string; patientId: string; firstName: string; lastName: string };
type TestOption = { id: string; name: string; category: string; unit: string; priceCents: number };

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function NewLabOrderForm({
  patients,
  tests,
  defaultPatientId,
  consultationId,
}: {
  patients: PatientOption[];
  tests: TestOption[];
  defaultPatientId?: string;
  consultationId?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createLabOrderAction, {
    error: null,
  });

  const byCategory = tests.reduce<Record<string, TestOption[]>>((acc, test) => {
    (acc[test.category] ??= []).push(test);
    return acc;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="consultationId" value={consultationId ?? ""} />

      <div className="space-y-1.5">
        <Label htmlFor="patientId">Patient</Label>
        <Select name="patientId" defaultValue={defaultPatientId} required>
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

      <div className="space-y-3">
        <Label>Tests</Label>
        {Object.entries(byCategory).map(([category, categoryTests]) => (
          <div key={category} className="space-y-1.5">
            <p className="text-caption text-muted-foreground font-semibold uppercase tracking-wide">
              {category}
            </p>
            {categoryTests.map((test) => (
              <label key={test.id} className="flex items-center gap-2 py-1">
                <Checkbox name="testIds" value={test.id} />
                <span className="text-body text-foreground">
                  {test.name} ({test.unit}) — {formatCents(test.priceCents)}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create Order"}
      </Button>
    </form>
  );
}
