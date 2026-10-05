"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department, Specialization } from "@prisma/client";

export function DoctorFilters({
  search,
  departmentId,
  specializationId,
  status,
  departments,
  specializations,
}: {
  search: string;
  departmentId: string;
  specializationId: string;
  status: string;
  departments: Department[];
  specializations: Specialization[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/doctors?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-xs flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2" />
        <Input
          placeholder="Search by name, email or license..."
          defaultValue={search}
          onChange={(e) => updateParam("search", e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={departmentId || "all"} onValueChange={(v) => updateParam("department", v === "all" ? "" : v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={specializationId || "all"}
        onValueChange={(v) => updateParam("specialization", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Specialization" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All specializations</SelectItem>
          {specializations.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
