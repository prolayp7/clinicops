"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdjustmentsAction, type FormState } from "../../actions";

export function AdjustmentsForm({
  invoiceId,
  discountCents,
  taxCents,
  adjustmentCents,
}: {
  invoiceId: string;
  discountCents: number;
  taxCents: number;
  adjustmentCents: number;
}) {
  const [state, formAction, isPending] = useActionState(updateAdjustmentsAction.bind(null, invoiceId), {
    error: null,
  } as FormState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="discountDollars">Discount (USD)</Label>
          <Input
            id="discountDollars"
            name="discountDollars"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(discountCents / 100).toFixed(2)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxDollars">Tax (USD)</Label>
          <Input
            id="taxDollars"
            name="taxDollars"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(taxCents / 100).toFixed(2)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adjustmentDollars">Adjustment (USD)</Label>
          <Input
            id="adjustmentDollars"
            name="adjustmentDollars"
            type="number"
            step="0.01"
            defaultValue={(adjustmentCents / 100).toFixed(2)}
          />
          <p className="text-caption text-muted-foreground">Can be negative.</p>
        </div>
      </div>
      {state.error && <p className="text-destructive text-body">{state.error}</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Saving…" : "Update Totals"}
      </Button>
    </form>
  );
}
