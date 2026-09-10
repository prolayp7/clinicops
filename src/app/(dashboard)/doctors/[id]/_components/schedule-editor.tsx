"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
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
import { dateToTimeString } from "@/lib/scheduling";
import type { DoctorAvailability, DoctorLeave, Weekday } from "@prisma/client";
import type { FormState } from "../../actions";

const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function titleCase(s: string) {
  return s[0] + s.slice(1).toLowerCase();
}

export function ScheduleEditor({
  doctorId,
  availability,
  leaves,
  canManage,
  onAddAvailability,
  onRemoveAvailability,
  onAddLeave,
  onRemoveLeave,
}: {
  doctorId: string;
  availability: DoctorAvailability[];
  leaves: DoctorLeave[];
  canManage: boolean;
  onAddAvailability: (prev: FormState, formData: FormData) => Promise<FormState>;
  onRemoveAvailability: (slotId: string) => Promise<void>;
  onAddLeave: (prev: FormState, formData: FormData) => Promise<FormState>;
  onRemoveLeave: (leaveId: string) => Promise<void>;
}) {
  const [availState, availAction, availPending] = useActionState<FormState, FormData>(
    onAddAvailability,
    { error: null },
  );
  const [leaveState, leaveAction, leavePending] = useActionState<FormState, FormData>(
    onAddLeave,
    { error: null },
  );

  const byDay = WEEKDAYS.map((day) => ({
    day,
    slots: availability.filter((a) => a.weekday === day),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-section-title text-foreground font-semibold">Weekly availability</h2>
        <div className="divide-border border-border divide-y rounded-lg border">
          {byDay.map(({ day, slots }) => (
            <div key={day} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="text-body text-foreground w-24 font-medium">{titleCase(day)}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {slots.length === 0 && (
                  <span className="text-caption text-muted-foreground">Unavailable</span>
                )}
                {slots.map((slot) => (
                  <span
                    key={slot.id}
                    className="bg-accent text-primary flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption"
                  >
                    {dateToTimeString(slot.startTime)}–{dateToTimeString(slot.endTime)}
                    {canManage && (
                      <button
                        type="button"
                        aria-label="Remove slot"
                        onClick={() => onRemoveAvailability(slot.id)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <form action={availAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="doctorId" value={doctorId} />
            <div className="space-y-1">
              <Label htmlFor="weekday">Day</Label>
              <Select name="weekday" defaultValue="MONDAY">
                <SelectTrigger id="weekday" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {titleCase(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" name="startTime" type="time" required className="w-32" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" name="endTime" type="time" required className="w-32" />
            </div>
            <Button type="submit" disabled={availPending} size="sm">
              {availPending ? "Adding…" : "Add block"}
            </Button>
          </form>
        )}
        {availState.error && <p className="text-destructive text-body">{availState.error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-section-title text-foreground font-semibold">Leave &amp; blocked dates</h2>
        <div className="divide-border border-border divide-y rounded-lg border">
          {leaves.length === 0 && (
            <p className="text-caption text-muted-foreground p-3">No leave scheduled.</p>
          )}
          {leaves.map((leave) => (
            <div key={leave.id} className="flex items-center justify-between gap-2 p-3">
              <div>
                <span className="text-body text-foreground">
                  {leave.startDate.toISOString().slice(0, 10)} –{" "}
                  {leave.endDate.toISOString().slice(0, 10)}
                </span>
                {leave.reason && (
                  <span className="text-caption text-muted-foreground block">{leave.reason}</span>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  aria-label="Remove leave"
                  onClick={() => onRemoveLeave(leave.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <form action={leaveAction} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="startDate">From</Label>
              <Input id="startDate" name="startDate" type="date" required className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">To</Label>
              <Input id="endDate" name="endDate" type="date" required className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input id="reason" name="reason" className="w-48" />
            </div>
            <Button type="submit" disabled={leavePending} size="sm">
              {leavePending ? "Adding…" : "Add leave"}
            </Button>
          </form>
        )}
        {leaveState.error && <p className="text-destructive text-body">{leaveState.error}</p>}
      </section>
    </div>
  );
}
