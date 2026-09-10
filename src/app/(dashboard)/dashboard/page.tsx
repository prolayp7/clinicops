import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCards } from "./_components/kpi-cards";
import { AppointmentTrendChart } from "./_components/appointment-trend-chart";
import { AppointmentStatusDonut } from "./_components/appointment-status-donut";
import { PatientQueue } from "./_components/patient-queue";
import { ActivityFeed } from "./_components/activity-feed";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <Badge variant="outline" className="text-primary border-transparent bg-accent gap-1.5">
              <span className="bg-success size-1.5 animate-pulse rounded-full" />
              Fictional demonstration data — not live
            </Badge>
            <span>•</span>
            <span className="text-foreground font-medium">Harbor Health Clinic</span>
            <span>•</span>
            <span>Outpatient Block A</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-page-title text-foreground font-bold">Clinical Operations Desk</h1>
            <Badge variant="secondary">Station 04-A</Badge>
          </div>
        </div>
        <Button disabled title="Available once Appointments (Phase 3) is built">
          <Plus className="size-4" />
          New Appointment
        </Button>
      </Card>

      <KpiCards />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppointmentTrendChart />
        <AppointmentStatusDonut />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <PatientQueue />
        <ActivityFeed />
      </div>
    </div>
  );
}
