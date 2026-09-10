"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PrescriptionFilters({
  doctorId,
  status,
  doctors,
}: {
  doctorId: string;
  status: string;
  doctors: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/prescriptions?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      <Select value={status || "all"} onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ISSUED">Issued</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
