"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClinicSetting } from "@prisma/client";
import { saveClinicSettingsAction, type FormState } from "../actions";

export function ClinicSettingsForm({ initial }: { initial: ClinicSetting | null }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveClinicSettingsAction,
    { error: null },
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <Field label="Clinic name" name="name" defaultValue={initial?.name} required />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" name="phone" defaultValue={initial?.phone} required />
        <Field label="Email" name="email" type="email" defaultValue={initial?.email} required />
      </div>
      <Field label="Address line 1" name="addressLine1" defaultValue={initial?.addressLine1} required />
      <Field label="Address line 2" name="addressLine2" defaultValue={initial?.addressLine2 ?? ""} />
      <div className="grid grid-cols-3 gap-4">
        <Field label="City" name="city" defaultValue={initial?.city} required />
        <Field label="State" name="state" defaultValue={initial?.state} required />
        <Field label="Postal code" name="postalCode" defaultValue={initial?.postalCode} required />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Country" name="country" defaultValue={initial?.country} required />
        <Field
          label="Timezone (IANA)"
          name="timezone"
          defaultValue={initial?.timezone ?? "America/New_York"}
          required
        />
        <Field
          label="Currency (ISO 4217)"
          name="currency"
          defaultValue={initial?.currency ?? "USD"}
          required
        />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save clinic profile"}
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
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
