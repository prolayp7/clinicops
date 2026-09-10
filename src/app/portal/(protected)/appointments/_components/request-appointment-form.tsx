"use client";

import { useActionState } from "react";
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
import { requestAppointmentAction, type FormState } from "../actions";

type DoctorOption = { id: string; fullName: string; specialization: { name: string } };

export function RequestAppointmentForm({ doctors }: { doctors: DoctorOption[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(requestAppointmentAction, {
    error: null,
  });
  const v = state.values;

  return (
    <form action={formAction} key={JSON.stringify(v)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="doctorId">Doctor</Label>
        <Select name="doctorId" defaultValue={v?.doctorId} required>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Preferred date</Label>
          <Input id="date" name="date" type="date" required defaultValue={v?.date} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Preferred time</Label>
          <Input id="startTime" name="startTime" type="time" required defaultValue={v?.startTime} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason for visit</Label>
        <Textarea id="reason" name="reason" rows={3} required defaultValue={v?.reason} />
      </div>

      {state.error && <p className="text-destructive text-body">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
