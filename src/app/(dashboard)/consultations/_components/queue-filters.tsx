"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function QueueFilters({
  date,
  doctorId,
  doctors,
}: {
  date: string;
  doctorId: string;
  doctors: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/consultations?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}
