import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@prisma/client";

const VARIANT: Record<AppointmentStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive"> = {
  REQUESTED: "info",
  SCHEDULED: "secondary",
  CONFIRMED: "info",
  CHECKED_IN: "warning",
  WAITING: "warning",
  IN_CONSULTATION: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}
