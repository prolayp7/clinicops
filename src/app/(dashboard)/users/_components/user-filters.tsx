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
import { roleLabel, STAFF_ROLES } from "@/lib/permissions/roles";

export function UserFilters({
  search,
  role,
  status,
}: {
  search: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/users?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by name or email..."
        defaultValue={search}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-xs"
      />
      <Select value={role || "all"} onValueChange={(v) => updateParam("role", v === "all" ? "" : v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {STAFF_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {roleLabel(r)}
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
