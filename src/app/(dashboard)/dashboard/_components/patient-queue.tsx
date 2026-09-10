"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patientQueue, type QueueStatus } from "../_data";

const STATUS_BADGE: Record<QueueStatus, { label: string; variant: "info" | "warning" | "success" | "default" | "secondary" }> = {
  "in-consult": { label: "In Consult", variant: "info" },
  waiting: { label: "Waiting", variant: "warning" },
  roomed: { label: "Roomed", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  scheduled: { label: "Scheduled", variant: "secondary" },
};

const TABS = [
  { key: "all", label: `All (${patientQueue.length})` },
  { key: "waiting", label: `Waiting (${patientQueue.filter((p) => p.status === "waiting").length})` },
  { key: "in-consult", label: `In-Consult (${patientQueue.filter((p) => p.status === "in-consult").length})` },
  { key: "scheduled", label: `Upcoming (${patientQueue.filter((p) => p.status === "scheduled").length})` },
  { key: "completed", label: `Done (${patientQueue.filter((p) => p.status === "completed").length})` },
] as const;

export function PatientQueue() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [filter, setFilter] = useState("");

  const rows = patientQueue.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
      <CardHeader className="flex-col items-start gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between [.border-b]:pb-4">
        <div>
          <h2 className="text-section-title text-foreground font-semibold">Today&apos;s Patient Queue</h2>
          <p className="text-caption text-muted-foreground">
            Clinical flow management &amp; examination room routing
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="whitespace-nowrap">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <div className="bg-muted flex items-center justify-between gap-4 px-4 py-2">
        <Input
          placeholder="Filter current queue..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-card h-8 max-w-sm"
        />
        <div className="flex items-center gap-2 text-caption">
          <span className="text-muted-foreground">Provider:</span>
          <Select defaultValue="all">
            <SelectTrigger size="sm" className="bg-card h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Physicians</SelectItem>
              <SelectItem value="jenkins">Dr. Sarah Jenkins, MD</SelectItem>
              <SelectItem value="patel">Dr. Rajesh Patel, DO</SelectItem>
              <SelectItem value="rostova">Dr. Elena Rostova, MD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Attending Doctor</th>
              <th className="px-4 py-2.5 font-semibold">Slot &amp; Room</th>
              <th className="px-4 py-2.5 font-semibold">Reason / Chief Complaint</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {rows.map((patient) => {
              const status = STATUS_BADGE[patient.status];
              return (
                <tr key={patient.id} className="hover:bg-muted/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src="" alt="" />
                        <AvatarFallback className="text-caption">{patient.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-foreground block leading-tight font-semibold">
                          {patient.name}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          MRN #{patient.mrn} • {patient.age}y {patient.sex}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground block leading-tight">{patient.doctor}</span>
                    <span className="text-caption text-muted-foreground">{patient.specialty}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground block font-medium">{patient.slot}</span>
                    <span className="text-caption text-primary">{patient.location}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground block">{patient.reason}</span>
                    {patient.flag ? (
                      <span className="text-caption text-destructive font-medium">{patient.flag}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={status.variant}>{patient.statusLabel}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="secondary" disabled title="Available once Appointments (Phase 3) is built">
                        {patient.action}
                      </Button>
                      <Button size="icon-sm" variant="ghost" disabled>
                        <MoreVertical className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>

      <CardFooter className="text-caption text-muted-foreground justify-between border-t py-3">
        <span>
          Showing {rows.length} of {patientQueue.length} active appointments for today
        </span>
      </CardFooter>
    </Card>
  );
}
