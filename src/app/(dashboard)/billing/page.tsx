import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { formatCents } from "@/lib/billing";
import { getRevenueSummary, listInvoices } from "@/server/services/invoices-service";
import { InvoiceFilters } from "./_components/invoice-filters";
import { InvoiceStatusBadge } from "./_components/invoice-status-badge";
import { RevenueSummary } from "./_components/revenue-summary";
import type { InvoiceStatus } from "@prisma/client";

function isOverdue(dueDate: Date | null, status: InvoiceStatus) {
  if (!dueDate || (status !== "UNPAID" && status !== "PARTIAL")) return false;
  return dueDate.getTime() < Date.now();
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "billing:view")) {
    redirect("/dashboard");
  }
  const canManage = can(actor.profile.role, "billing:manage-invoices");
  const canViewRevenue = can(actor.profile.role, "billing:view-revenue");

  const params = await searchParams;
  const status = params.status as InvoiceStatus | undefined;

  const { items } = await listInvoices(actor, { status, pageSize: 100 });

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const revenue = canViewRevenue ? await getRevenueSummary(actor, { from, to }) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Billing</h1>
          <p className="text-muted-foreground text-body">Invoices, payments and refunds.</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/billing/new">
              <Plus className="size-4" />
              New Invoice
            </Link>
          </Button>
        )}
      </div>

      {revenue && <RevenueSummary summary={revenue} />}

      <InvoiceFilters status={status ?? ""} />

      <Card className="gap-0 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted text-table-header text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Invoice #</th>
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Total</th>
              <th className="px-4 py-2.5 font-semibold">Paid</th>
              <th className="px-4 py-2.5 font-semibold">Balance</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border text-body divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                  No invoices found.
                </td>
              </tr>
            )}
            {items.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-4 py-3">
                  <Link href={`/billing/${invoice.id}`} className="text-foreground hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="text-foreground px-4 py-3">
                  {invoice.patient.firstName} {invoice.patient.lastName}
                  <span className="text-muted-foreground"> · {invoice.patient.patientId}</span>
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {invoice.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="text-foreground px-4 py-3">{formatCents(invoice.totalCents)}</td>
                <td className="text-foreground px-4 py-3">{formatCents(invoice.paidCents)}</td>
                <td className="text-foreground px-4 py-3">
                  {formatCents(invoice.totalCents - invoice.paidCents)}
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge
                    status={invoice.status}
                    overdue={isOverdue(invoice.dueDate, invoice.status)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
