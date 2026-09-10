"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export function AppointmentFilters({
  date,
  doctorId,
  status,
  view,
  doctors,
}: {
  date: string;
  doctorId: string;
  status: string;
  view: "list" | "calendar";
  doctors: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/appointments?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
        <Button
          type="button"
          size="sm"
          variant={view === "calendar" ? "default" : "ghost"}
          onClick={() => updateParam("view", "calendar")}
        >
          Calendar
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "ghost"}
          onClick={() => updateParam("view", "list")}
        >
          List
        </Button>
      </div>
      <Input
        type="date"
        value={date}
        onChange={(e) => updateParam("date", e.target.value)}
        className="w-40"
      />
      <Select value={doctorId || "all"} onValueChange={(v) => updateParam("doctorId", v === "all" ? "" : v)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All doctors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All doctors</SelectItem>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {view === "list" && (
        <Select value={status || "all"} onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
