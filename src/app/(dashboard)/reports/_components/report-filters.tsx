"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_LABELS, REPORT_TYPES, type ReportType } from "@/lib/reports";

export function ReportFilters({
  type,
  from,
  to,
}: {
  type: ReportType;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/reports?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <Select value={type} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPORT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {REPORT_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" value={from} onChange={(e) => updateParam("from", e.target.value)} className="w-40" />
      <span className="text-muted-foreground text-body">to</span>
      <Input type="date" value={to} onChange={(e) => updateParam("to", e.target.value)} className="w-40" />
      <Button asChild size="sm" variant="secondary">
        <a href={`/api/reports/${type}/csv?from=${from}&to=${to}`}>
          <Download className="size-4" />
          Export CSV
        </a>
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  );
}
