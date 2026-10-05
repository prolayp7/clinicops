import { BadgeCheck, CalendarCheck, Gauge, Stethoscope, TreePalm } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { summarizeDirectory } from "@/lib/doctor-directory";

const ACCENT_BAR = {
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
} as const;

const ACCENT_ICON_BG = {
  primary: "bg-accent text-primary",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
} as const;

export function DoctorDirectoryStats({
  summary,
  departmentCount,
}: {
  summary: ReturnType<typeof summarizeDirectory>;
  departmentCount: number;
}) {
  const cards = [
    {
      key: "credentialed",
      label: "Credentialed Staff",
      value: String(summary.totalDoctors),
      sub: `${departmentCount} department${departmentCount === 1 ? "" : "s"}`,
      icon: BadgeCheck,
      accent: "primary" as const,
    },
    {
      key: "on-shift",
      label: "Available Today",
      value: String(summary.onShiftToday),
      sub: "On shift, from weekly availability",
      icon: CalendarCheck,
      accent: "success" as const,
    },
    {
      key: "in-consultation",
      label: "In Consultation",
      value: String(summary.inConsultation),
      sub: "Live from today's appointments",
      icon: Stethoscope,
      accent: "info" as const,
    },
    {
      key: "on-leave",
      label: "Approved Leave",
      value: String(summary.onLeave),
      sub: "Blocked/leave dates covering today",
      icon: TreePalm,
      accent: "warning" as const,
    },
    {
      key: "utilization",
      label: "Slot Utilization",
      value: `${summary.utilizationPercent}%`,
      sub: `${summary.slotsBooked} of ${summary.slotsCapacity} slots booked today`,
      icon: Gauge,
      accent: "primary" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="relative gap-2 overflow-hidden p-4">
            <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_BAR[card.accent])} />
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  ACCENT_ICON_BG[card.accent],
                )}
              >
                <Icon className="size-[18px]" />
              </div>
            </div>
            <div className="text-card-metric text-foreground font-bold">{card.value}</div>
            <p className="text-caption text-muted-foreground">{card.sub}</p>
          </Card>
        );
      })}
    </div>
  );
}
