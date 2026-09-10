"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { issuePrescriptionAction, type IssueFormState } from "../../actions";

export function IssueButton({ prescriptionId }: { prescriptionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<IssueFormState, FormData>(
    async (prev) => {
      const result = await issuePrescriptionAction(prescriptionId, prev);
      if (!result.error) setOpen(false);
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        Issue Prescription
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue this prescription?</DialogTitle>
        </DialogHeader>
        <p className="text-body text-muted-foreground">
          Once issued, this prescription is locked — medicines can no longer be added or removed.
        </p>
        <form action={formAction}>
          {state.error && <p className="text-destructive text-body mb-2">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Issuing…" : "Confirm & Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
