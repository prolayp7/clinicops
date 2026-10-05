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

const STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "REVIEWED", "CANCELLED"] as const;

export function LabOrderFilters({ search, status }: { search: string; status: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/laboratory?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search order, patient or ID..."
        aria-label="Search lab orders"
        defaultValue={search}
        onChange={(event) => updateParam("search", event.target.value)}
        className="max-w-sm"
      />
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
