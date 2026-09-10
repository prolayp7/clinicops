"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "REVIEWED", "CANCELLED"] as const;

export function LabOrderFilters({ status }: { status: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/laboratory?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}
