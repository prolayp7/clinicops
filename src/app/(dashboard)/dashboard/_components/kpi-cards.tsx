import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  Hourglass,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { kpis } from "../_data";

const ICONS = {
  calendar: Calendar,
  hourglass: Hourglass,
  check: CheckCircle2,
  alert: AlertCircle,
  payments: Banknote,
} as const;

const ACCENT_BAR = {
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
} as const;

const ACCENT_ICON_BG = {
  primary: "bg-accent text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
} as const;

const TREND_TEXT = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = ICONS[kpi.icon];
        return (
          <Card key={kpi.key} className="relative gap-2 overflow-hidden p-4">
            <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_BAR[kpi.accent])} />
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  ACCENT_ICON_BG[kpi.accent],
                )}
              >
                <Icon className="size-[18px]" />
              </div>
            </div>
            <div className="text-card-metric text-foreground font-bold">{kpi.value}</div>
            <div className="flex items-center gap-1.5 text-caption">
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", TREND_TEXT[kpi.trend.tone])}>
                {kpi.trend.direction === "up" ? <TrendingUp className="size-3.5" /> : null}
                {kpi.trend.text}
              </span>
              <span className="text-muted-foreground">{kpi.sub}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
