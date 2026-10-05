import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { listLabOrders } from "@/server/services/lab-orders-service";
import { labOrderListFiltersSchema } from "@/lib/validation/lab-orders";
import { LabOrderFilters } from "./_components/lab-order-filters";
import { LabOrderStatusBadge } from "./_components/lab-order-status-badge";
import type { LabOrderStatus } from "@prisma/client";

const PAGE_SIZE = 10;

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
  const parsedFilters = labOrderListFiltersSchema.safeParse(params);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { search: "", status: undefined, page: 1 };

  const { items, total } = await listLabOrders(actor, {
    search: filters.search,
    status: filters.status,
    page: filters.page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LabOrderFilters search={filters.search} status={filters.status ?? ""} />
        <span className="text-caption text-muted-foreground">Showing {items.length} of {total} orders</span>
      </div>

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

      {totalPages > 1 && (
        <div className="text-caption text-muted-foreground flex items-center justify-between">
          <span>Page {filters.page} of {totalPages}</span>
          <div className="flex gap-1.5">
            {filters.page <= 1 ? (
              <Button size="sm" variant="secondary" disabled>Previous</Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={pageHref(params, filters.page - 1)}>Previous</Link>
              </Button>
            )}
            {filters.page >= totalPages ? (
              <Button size="sm" variant="secondary" disabled>Next</Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={pageHref(params, filters.page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && value) query.set(key, value);
  }
  query.set("page", String(page));
  return `/laboratory?${query.toString()}`;
}
