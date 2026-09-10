import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@prisma/client";

const VARIANT: Record<InvoiceStatus, "default" | "secondary" | "success" | "warning" | "info" | "destructive"> = {
  UNPAID: "warning",
  PARTIAL: "info",
  PAID: "success",
  REFUNDED: "destructive",
};

export function InvoiceStatusBadge({
  status,
  overdue,
}: {
  status: InvoiceStatus;
  overdue?: boolean;
}) {
  if (overdue && (status === "UNPAID" || status === "PARTIAL")) {
    return <Badge variant="destructive">OVERDUE</Badge>;
  }
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
