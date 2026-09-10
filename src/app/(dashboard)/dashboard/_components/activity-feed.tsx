import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { activityFeed } from "../_data";

const DOT_COLOR = {
  info: "bg-info",
  warning: "bg-warning",
  critical: "bg-destructive",
  primary: "bg-primary",
  success: "bg-success",
} as const;

export function ActivityFeed() {
  return (
    <Card className="gap-4">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-section-title text-foreground font-semibold">Recent Activity</h2>
          <Button variant="link" size="sm" className="text-caption h-auto p-0" disabled>
            Clear Feed
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">
          Clinical, lab, and operational audit log stream
        </p>
      </CardHeader>
      <CardContent>
        <ol className="border-border relative space-y-4 border-l pl-6">
          {activityFeed.map((event) => {
            const isCritical = event.tone === "critical";
            return (
              <li
                key={event.id}
                className={cn("relative", isCritical && "bg-destructive/5 -ml-2 rounded-lg p-2.5")}
              >
                <span
                  className={cn(
                    "ring-card absolute top-1 -left-[27px] size-3.5 rounded-full ring-4",
                    DOT_COLOR[event.tone],
                  )}
                />
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-caption font-bold",
                      isCritical ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {event.time}
                  </span>
                  {isCritical ? (
                    <Badge variant="destructive">CRITICAL</Badge>
                  ) : (
                    <span className="text-caption text-muted-foreground">{event.category}</span>
                  )}
                </div>
                <p className="text-body text-foreground mt-0.5">{event.message}</p>
                <span
                  className={cn(
                    "text-caption",
                    isCritical ? "text-destructive font-semibold" : "text-muted-foreground",
                  )}
                >
                  {event.meta}
                </span>
              </li>
            );
          })}
        </ol>
        <Button variant="secondary" className="mt-4 w-full" disabled>
          View Complete Event Audit
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
