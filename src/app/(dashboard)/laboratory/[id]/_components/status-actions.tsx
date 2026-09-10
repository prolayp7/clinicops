"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VALID_TRANSITIONS, isReasonRequired } from "@/lib/laboratory";
import { changeStatusAction, type StatusFormState } from "../../actions";
import type { LabOrderStatus } from "@prisma/client";

const STATUS_LABEL: Record<LabOrderStatus, string> = {
  ORDERED: "Ordered",
  SAMPLE_COLLECTED: "Mark sample collected",
  PROCESSING: "Start processing",
  COMPLETED: "Mark completed",
  REVIEWED: "Review & release",
  CANCELLED: "Cancel order",
};

export function StatusActions({
  labOrderId,
  currentStatus,
  allowedTargets,
}: {
  labOrderId: string;
  currentStatus: LabOrderStatus;
  allowedTargets: readonly LabOrderStatus[];
}) {
  const nextStatuses = VALID_TRANSITIONS[currentStatus].filter((s) => allowedTargets.includes(s));

  if (nextStatuses.length === 0) {
    return <p className="text-muted-foreground text-body">No actions available for this order.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((toStatus) =>
        isReasonRequired(toStatus) ? (
          <ReasonRequiredAction
            key={toStatus}
            labOrderId={labOrderId}
            fromStatus={currentStatus}
            toStatus={toStatus}
          />
        ) : (
          <DirectAction
            key={toStatus}
            labOrderId={labOrderId}
            fromStatus={currentStatus}
            toStatus={toStatus}
          />
        ),
      )}
    </div>
  );
}

function DirectAction({
  labOrderId,
  fromStatus,
  toStatus,
}: {
  labOrderId: string;
  fromStatus: LabOrderStatus;
  toStatus: LabOrderStatus;
}) {
  const [state, formAction, isPending] = useActionState<StatusFormState, FormData>(
    changeStatusAction.bind(null, labOrderId, fromStatus, toStatus),
    { error: null },
  );

  return (
    <div>
      <form action={formAction}>
        <Button type="submit" size="sm" variant={toStatus === "REVIEWED" ? "default" : "secondary"} disabled={isPending}>
          {STATUS_LABEL[toStatus]}
        </Button>
      </form>
      {state.error && <p className="text-destructive text-caption mt-1">{state.error}</p>}
    </div>
  );
}

function ReasonRequiredAction({
  labOrderId,
  fromStatus,
  toStatus,
}: {
  labOrderId: string;
  fromStatus: LabOrderStatus;
  toStatus: LabOrderStatus;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<StatusFormState, FormData>(
    async (prev, formData) => {
      const result = await changeStatusAction(labOrderId, fromStatus, toStatus, prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          {STATUS_LABEL[toStatus]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STATUS_LABEL[toStatus]}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" name="reason" rows={3} required />
          </div>
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
