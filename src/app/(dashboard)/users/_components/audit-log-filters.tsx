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
import { ALL_ROLES, roleLabel } from "@/lib/permissions/roles";

export function AuditLogFilters({
  search,
  actorRole,
  from,
  to,
}: {
  search: string;
  actorRole: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "activity");
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/users?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by action or record type..."
        defaultValue={search}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-xs"
      />
      <Select value={actorRole || "all"} onValueChange={(v) => updateParam("role", v === "all" ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Actor role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {ALL_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabel(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" value={from} onChange={(e) => updateParam("from", e.target.value)} className="w-40" />
      <Input type="date" value={to} onChange={(e) => updateParam("to", e.target.value)} className="w-40" />
    </div>
  );
}
