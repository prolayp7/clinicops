"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department, Doctor, Specialization, StaffProfile } from "@prisma/client";
import type { FormState } from "../actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  departments: Department[];
  specializations: Specialization[];
  unlinkedStaff?: StaffProfile[];
  initial?: Doctor | null;
};

export function DoctorForm({ action, departments, specializations, unlinkedStaff, initial }: Props) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {!initial && (
        <div className="space-y-1.5">
          <Label htmlFor="staffProfileId">Staff account</Label>
          <Select name="staffProfileId" required>
            <SelectTrigger id="staffProfileId" className="w-full">
              <SelectValue placeholder="Select a Doctor-role staff account" />
            </SelectTrigger>
            <SelectContent>
              {(unlinkedStaff ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName} — {s.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unlinkedStaff?.length === 0 && (
            <p className="text-caption text-muted-foreground">
              No unlinked Doctor-role accounts. Create one under Users first.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name" name="fullName" defaultValue={initial?.fullName} required />
        <Field label="License / reference number" name="licenseNumber" defaultValue={initial?.licenseNumber} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email" name="email" type="email" defaultValue={initial?.email} required />
        <Field label="Phone" name="phone" defaultValue={initial?.phone} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="departmentId">Department</Label>
          <Select name="departmentId" defaultValue={initial?.departmentId} required>
            <SelectTrigger id="departmentId" className="w-full">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specializationId">Specialization</Label>
          <Select name="specializationId" defaultValue={initial?.specializationId} required>
            <SelectTrigger id="specializationId" className="w-full">
              <SelectValue placeholder="Select a specialization" />
            </SelectTrigger>
            <SelectContent>
              {specializations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Input
          id="qualifications"
          name="qualifications"
          placeholder="MD, MBBS, FRCS (comma-separated)"
          defaultValue={initial?.qualifications.join(", ")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="consultationFeeDollars">Consultation fee (USD)</Label>
          <Input
            id="consultationFeeDollars"
            name="consultationFeeDollars"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial ? (initial.consultationFeeCents / 100).toFixed(2) : undefined}
            required
          />
        </div>
        <Field
          label="Slot duration (minutes)"
          name="slotDurationMinutes"
          type="number"
          defaultValue={String(initial?.slotDurationMinutes ?? 30)}
          required
        />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : initial ? "Save changes" : "Register doctor"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
