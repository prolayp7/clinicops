"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePortalProfileAction, type FormState } from "../actions";
import type { Patient } from "@prisma/client";

export function ProfileForm({ patient }: { patient: Patient }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updatePortalProfileAction, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" required defaultValue={patient.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={patient.email ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="addressLine1">Address line 1</Label>
        <Input id="addressLine1" name="addressLine1" defaultValue={patient.addressLine1 ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addressLine2">Address line 2</Label>
        <Input id="addressLine2" name="addressLine2" defaultValue={patient.addressLine2 ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={patient.city ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={patient.state ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" name="postalCode" defaultValue={patient.postalCode ?? ""} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={patient.country ?? ""} />
      </div>

      <div className="border-border grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactName">Emergency contact name</Label>
          <Input id="emergencyContactName" name="emergencyContactName" defaultValue={patient.emergencyContactName ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
          <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={patient.emergencyContactPhone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactRelationship">Relationship</Label>
          <Input
            id="emergencyContactRelationship"
            name="emergencyContactRelationship"
            defaultValue={patient.emergencyContactRelationship ?? ""}
          />
        </div>
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}
      {state.success && <p className="text-body text-success">Profile updated.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
