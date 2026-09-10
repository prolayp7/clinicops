import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listLabOrders } from "@/server/services/lab-orders-service";
import { LabOrderFilters } from "./_components/lab-order-filters";
import { LabOrderStatusBadge } from "./_components/lab-order-status-badge";
import type { LabOrderStatus } from "@prisma/client";

export default async function LaboratoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "laboratory:view")) {
    redirect("/dashboard");
  }
  const canOrder = can(actor.profile.role, "laboratory:manage-orders");

  const params = await searchParams;
  const status = params.status as LabOrderStatus | undefined;

  const { items } = await listLabOrders(actor, { status, pageSize: 100 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Laboratory</h1>
          <p className="text-muted-foreground text-body">
            Orders, manual sample workflow and results.
          </p>
        </div>
        {canOrder && (
          <Button asChild>
            <Link href="/laboratory/new">
              <Plus className="size-4" />
              New Order
            </Link>
          </Button>
        )}
      </div>

      <LabOrderFilters status={status ?? ""} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Order #</th>
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Ordered by</th>
              <th className="px-4 py-2.5 font-semibold">Tests</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                  No lab orders found.
                </td>
              </tr>
            )}
            {items.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3">
                  <Link href={`/laboratory/${order.id}`} className="text-foreground hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="text-foreground px-4 py-3">
                  {order.patient.firstName} {order.patient.lastName}
                  <span className="text-muted-foreground"> · {order.patient.patientId}</span>
                </td>
                <td className="text-foreground px-4 py-3">{order.orderedBy.fullName}</td>
                <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                  {order.items.map((i) => i.labTest.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <LabOrderStatusBadge status={order.status} />
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {order.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
