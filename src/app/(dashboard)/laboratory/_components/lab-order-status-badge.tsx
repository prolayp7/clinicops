import { Badge } from "@/components/ui/badge";
import type { LabOrderStatus } from "@prisma/client";

const VARIANT: Record<LabOrderStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive"> = {
  ORDERED: "info",
  SAMPLE_COLLECTED: "warning",
  PROCESSING: "warning",
  COMPLETED: "default",
  REVIEWED: "success",
  CANCELLED: "destructive",
};

export function LabOrderStatusBadge({ status }: { status: LabOrderStatus }) {
  return <Badge variant={VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}
