import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { formatCents, isInvoiceEditable, maxRefundableCents } from "@/lib/billing";
import { getInvoiceById } from "@/server/services/invoices-service";
import { prisma } from "@/lib/db/prisma";
import { InvoiceStatusBadge } from "../_components/invoice-status-badge";
import { AddItemForm } from "./_components/add-item-form";
import { AdjustmentsForm } from "./_components/adjustments-form";
import { PaymentDialog } from "./_components/payment-dialog";
import { RefundDialog } from "./_components/refund-dialog";
import { removeItemAction } from "../actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "billing:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invoice = await getInvoiceById(actor, id);
  if (!invoice) notFound();

  const canManage = can(actor.profile.role, "billing:manage-invoices");
  const canRecordPaymentPerm = can(actor.profile.role, "billing:record-payment");
  const canRefundPerm = can(actor.profile.role, "billing:refund");
  const editable = isInvoiceEditable(invoice.payments.length);
  const balanceCents = invoice.totalCents - invoice.paidCents;

  const [consultations, labOrders] = editable
    ? await Promise.all([
        prisma.consultation.findMany({
          where: { patientId: invoice.patientId, status: "COMPLETED" },
          select: { id: true, diagnosis: true, createdAt: true, doctor: { select: { consultationFeeCents: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.labOrder.findMany({
          where: { patientId: invoice.patientId },
          select: { id: true, orderNumber: true, items: { select: { priceCents: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-4">
      <Card className="space-y-1 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-page-title text-foreground font-bold">{invoice.invoiceNumber}</h1>
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Button asChild size="sm" variant="secondary">
              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="size-4" />
                Print / PDF
              </a>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-body">
          <Link href={`/patients/${invoice.patient.id}`} className="hover:underline">
            {invoice.patient.firstName} {invoice.patient.lastName}
          </Link>{" "}
          · #{invoice.patient.patientId} · created by {invoice.createdBy.fullName}
        </p>
        <p className="text-caption text-muted-foreground">
          {invoice.createdAt.toISOString().slice(0, 10)}
          {invoice.dueDate ? ` • Due ${invoice.dueDate.toISOString().slice(0, 10)}` : ""}
        </p>
        {invoice.notes && <p className="text-body text-foreground mt-1">{invoice.notes}</p>}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Charges</h2>
        {invoice.items.length === 0 ? (
          <p className="text-muted-foreground text-body">No charges added yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-table-header text-muted-foreground uppercase tracking-wider">
                <th className="py-2 pr-4 font-semibold">Description</th>
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 pr-4 font-semibold">Qty</th>
                <th className="py-2 pr-4 font-semibold">Unit Price</th>
                <th className="py-2 pr-4 font-semibold">Amount</th>
                {editable && canManage && <th className="py-2 pr-4" />}
              </tr>
            </thead>
            <tbody className="divide-border text-body divide-y">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="secondary">{item.category}</Badge>
                  </td>
                  <td className="py-2 pr-4">{item.quantity}</td>
                  <td className="py-2 pr-4">{formatCents(item.unitPriceCents)}</td>
                  <td className="py-2 pr-4">{formatCents(item.amountCents)}</td>
                  {editable && canManage && (
                    <td className="py-2 pr-4">
                      <form action={removeItemAction.bind(null, invoice.id, item.id)}>
                        <Button type="submit" size="icon-sm" variant="ghost" aria-label="Remove charge">
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {editable && canManage && (
          <div className="border-border border-t pt-4">
            <AddItemForm
              invoiceId={invoice.id}
              consultations={consultations.map((c) => ({
                id: c.id,
                label: `${c.createdAt.toISOString().slice(0, 10)} — ${c.diagnosis || "Consultation"}`,
                feeCents: c.doctor.consultationFeeCents,
              }))}
              labOrders={labOrders.map((o) => ({
                id: o.id,
                label: o.orderNumber,
                totalCents: o.items.reduce((sum, i) => sum + i.priceCents, 0),
              }))}
            />
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-section-title text-foreground font-semibold">Totals</h2>
        {editable && canManage && (
          <AdjustmentsForm
            invoiceId={invoice.id}
            discountCents={invoice.discountCents}
            taxCents={invoice.taxCents}
            adjustmentCents={invoice.adjustmentCents}
          />
        )}
        <div className="max-w-xs space-y-1.5">
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCents(invoice.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-foreground">-{formatCents(invoice.discountCents)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">Tax</span>
            <span className="text-foreground">{formatCents(invoice.taxCents)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">Adjustment</span>
            <span className="text-foreground">{formatCents(invoice.adjustmentCents)}</span>
          </div>
          <div className="border-border flex justify-between border-t pt-1.5 text-body font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{formatCents(invoice.totalCents)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-muted-foreground">Paid</span>
            <span className="text-foreground">{formatCents(invoice.paidCents)}</span>
          </div>
          <div className="flex justify-between text-body font-semibold">
            <span className="text-destructive">Balance due</span>
            <span className="text-destructive">{formatCents(balanceCents)}</span>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-section-title text-foreground font-semibold">Payments</h2>
          {canRecordPaymentPerm && balanceCents > 0 && (
            <PaymentDialog invoiceId={invoice.id} balanceCents={balanceCents} />
          )}
        </div>
        {invoice.payments.length === 0 ? (
          <p className="text-muted-foreground text-body">No payments recorded yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {invoice.payments.map((payment) => {
              const refundedForPayment = payment.refunds.reduce((sum, r) => sum + r.amountCents, 0);
              const refundable = maxRefundableCents(payment.amountCents, refundedForPayment);
              return (
                <li key={payment.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body text-foreground font-semibold">
                        {formatCents(payment.amountCents)} · {payment.method.replace("_", " ")}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {payment.createdAt.toISOString().slice(0, 10)} by {payment.recordedBy.fullName}
                        {payment.reference ? ` • ${payment.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/api/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">
                          Receipt
                        </a>
                      </Button>
                      {canRefundPerm && (
                        <RefundDialog
                          invoiceId={invoice.id}
                          paymentId={payment.id}
                          maxRefundableCents={refundable}
                        />
                      )}
                    </div>
                  </div>
                  {payment.refunds.map((refund) => (
                    <p key={refund.id} className="text-caption text-destructive pl-4">
                      Refunded {formatCents(refund.amountCents)} on {refund.createdAt.toISOString().slice(0, 10)}{" "}
                      by {refund.recordedBy.fullName} — {refund.reason}
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
