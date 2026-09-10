import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { listPortalLabOrders } from "@/server/services/portal-service";

export default async function PortalLabReportsPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const orders = await listPortalLabOrders(patient.patient.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Lab Reports</h1>
        <p className="text-muted-foreground text-body">Results released after doctor review.</p>
      </div>

      {orders.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-body">No released lab reports yet.</Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-body text-foreground font-semibold">{order.orderNumber}</p>
                <p className="text-caption text-muted-foreground">
                  Reviewed {order.reviewedAt?.toISOString().slice(0, 10)}
                </p>
                <p className="text-caption text-muted-foreground">
                  {order.items.map((i) => i.labTest.name).join(", ")}
                </p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <a href={`/api/lab-orders/${order.id}/pdf`} target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  PDF
                </a>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
