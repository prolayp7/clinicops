"use client";

import { useActionState, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rescheduleAppointmentAction, type FormState } from "../../actions";

export function RescheduleDialog({
  appointmentId,
  canOverride,
}: {
  appointmentId: string;
  canOverride: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [force, setForce] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await rescheduleAppointmentAction(appointmentId, prev, formData);
      if (!result.error && !result.availabilityWarning) setOpen(false);
      return result;
    },
    { error: null },
  );

  function rescheduleAnyway() {
    setForce(true);
    // Re-submit on next tick so the hidden "force" input picks up the new value first — a
    // type="submit" button with an onClick side effect would submit before React re-renders.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setForce(false);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={formAction}
          key={JSON.stringify(state.values)}
          className="space-y-3"
        >
          <input type="hidden" name="force" value={force ? "true" : "false"} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                name="date"
                type="date"
                required
                defaultValue={state.values?.date}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time">New start time</Label>
              <Input
                id="reschedule-time"
                name="startTime"
                type="time"
                required
                defaultValue={state.values?.startTime}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-reason">Reason</Label>
            <Textarea
              id="reschedule-reason"
              name="reason"
              rows={3}
              required
              defaultValue={state.values?.reason}
            />
          </div>

          {state.availabilityWarning && (
            <div className="border-warning bg-warning/5 rounded-lg border p-3">
              <div className="flex gap-2">
                <AlertTriangle className="text-warning size-4 shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-body text-foreground">{state.availabilityWarning}</p>
                  {canOverride && (
                    <Button type="button" size="sm" variant="secondary" onClick={rescheduleAnyway}>
                      Reschedule anyway
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {state.error && <p className="text-destructive text-body">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
