"use client";

import { useActionState, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { bookAppointmentAction, type FormState } from "../actions";

type PatientOption = { id: string; patientId: string; firstName: string; lastName: string };
type DoctorOption = { id: string; fullName: string; specialization: { name: string } };

export function BookingForm({
  patients,
  doctors,
  canOverride,
  defaultDoctorId,
  defaultDate,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  canOverride: boolean;
  defaultDoctorId?: string;
  defaultDate?: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(bookAppointmentAction, {
    error: null,
  });
  const [force, setForce] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function bookAnyway() {
    setForce(true);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const v = state.values;

  return (
    <form ref={formRef} action={formAction} key={JSON.stringify(v)} className="space-y-4">
      <input type="hidden" name="force" value={force ? "true" : "false"} />

      <div className="space-y-1.5">
        <Label htmlFor="patientId">Patient</Label>
        <Select name="patientId" defaultValue={v?.patientId} required>
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
        <Label htmlFor="doctorId">Doctor</Label>
        <Select name="doctorId" defaultValue={v?.doctorId ?? defaultDoctorId} required>
          <SelectTrigger id="doctorId" className="w-full">
            <SelectValue placeholder="Select a doctor" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.fullName} — {d.specialization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={v?.date ?? defaultDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" required defaultValue={v?.startTime} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="source">Booking source</Label>
        <Select name="source" defaultValue={v?.source ?? "STAFF_BOOKED"} required>
          <SelectTrigger id="source" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STAFF_BOOKED">Staff booked</SelectItem>
            <SelectItem value="WALK_IN">Walk-in</SelectItem>
            <SelectItem value="ONLINE_REQUEST">Online request (awaiting confirmation)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason for visit</Label>
        <Textarea id="reason" name="reason" rows={3} required defaultValue={v?.reason} />
      </div>

      {state.availabilityWarning && (
        <div className="border-warning bg-warning/5 rounded-lg border p-4">
          <div className="flex gap-3">
            <AlertTriangle className="text-warning size-5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-body text-foreground font-semibold">{state.availabilityWarning}</p>
              {canOverride ? (
                <>
                  <p className="text-caption text-muted-foreground">
                    You can book outside the doctor&apos;s normal availability if this is intentional.
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={bookAnyway}>
                    Book anyway
                  </Button>
                </>
              ) : (
                <p className="text-caption text-muted-foreground">
                  Ask an admin or receptionist to override this if the visit still needs to happen.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Booking…" : "Book appointment"}
      </Button>
    </form>
  );
}
