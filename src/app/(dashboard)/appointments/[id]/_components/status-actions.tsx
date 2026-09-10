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
import { VALID_TRANSITIONS, isReasonRequired } from "@/lib/appointments";
import { changeStatusAction, type StatusFormState } from "../../actions";
import { startConsultationAction } from "../../../consultations/actions";
import type { AppointmentStatus } from "@prisma/client";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirm",
  CHECKED_IN: "Check in",
  WAITING: "Move to waiting",
  IN_CONSULTATION: "Start consultation",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
  NO_SHOW: "Mark no-show",
};

export function StatusActions({
  appointmentId,
  currentStatus,
  canStartConsultation,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  canStartConsultation: boolean;
}) {
  const nextStatuses = VALID_TRANSITIONS[currentStatus].filter(
    (s) => s !== "IN_CONSULTATION" || canStartConsultation,
  );

  if (nextStatuses.length === 0) {
    return <p className="text-muted-foreground text-body">This appointment is closed out.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((toStatus) =>
        toStatus === "IN_CONSULTATION" ? (
          <form key={toStatus} action={startConsultationAction.bind(null, appointmentId)}>
            <Button type="submit" size="sm" variant="secondary">
              {STATUS_LABEL[toStatus]}
            </Button>
          </form>
        ) : isReasonRequired(toStatus) ? (
          <ReasonRequiredAction
            key={toStatus}
            appointmentId={appointmentId}
            fromStatus={currentStatus}
            toStatus={toStatus}
          />
        ) : (
          <DirectAction
            key={toStatus}
            appointmentId={appointmentId}
            fromStatus={currentStatus}
            toStatus={toStatus}
          />
        ),
      )}
    </div>
  );
}

function DirectAction({
  appointmentId,
  fromStatus,
  toStatus,
}: {
  appointmentId: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
}) {
  const [state, formAction, isPending] = useActionState<StatusFormState, FormData>(
    changeStatusAction.bind(null, appointmentId, fromStatus, toStatus),
    { error: null },
  );

  return (
    <div>
      <form action={formAction}>
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {STATUS_LABEL[toStatus]}
        </Button>
      </form>
      {state.error && <p className="text-destructive text-caption mt-1">{state.error}</p>}
    </div>
  );
}

function ReasonRequiredAction({
  appointmentId,
  fromStatus,
  toStatus,
}: {
  appointmentId: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<StatusFormState, FormData>(
    async (prev, formData) => {
      const result = await changeStatusAction(appointmentId, fromStatus, toStatus, prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={toStatus === "CANCELLED" ? "destructive" : "secondary"}>
          {STATUS_LABEL[toStatus]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STATUS_LABEL[toStatus]}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${toStatus}`}>Reason</Label>
            <Textarea id={`reason-${toStatus}`} name="reason" rows={3} required />
          </div>
          {state.error && <p className="text-destructive text-body">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending} variant={toStatus === "CANCELLED" ? "destructive" : "default"}>
              {isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
