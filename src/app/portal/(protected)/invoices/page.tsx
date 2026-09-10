import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { formatCents } from "@/lib/billing";
import { listPortalInvoices } from "@/server/services/portal-service";

export default async function PortalInvoicesPage() {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  const invoices = await listPortalInvoices(patient.patient.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Billing</h1>
        <p className="text-muted-foreground text-body">Your invoices and payment receipts.</p>
      </div>

      {invoices.length === 0 ? (
        <Card className="text-muted-foreground p-8 text-center text-body">No invoices yet.</Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body text-foreground font-semibold">{invoice.invoiceNumber}</p>
                  <p className="text-caption text-muted-foreground">
                    {invoice.createdAt.toISOString().slice(0, 10)} • Total {formatCents(invoice.totalCents)} •
                    Balance {formatCents(invoice.totalCents - invoice.paidCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={invoice.status === "PAID" ? "success" : "secondary"}>{invoice.status}</Badge>
                  <Button asChild size="sm" variant="secondary">
                    <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                      <Download className="size-4" />
                      Invoice
                    </a>
                  </Button>
                </div>
              </div>
              {invoice.payments.length > 0 && (
                <div className="border-border flex flex-wrap gap-2 border-t pt-2">
                  {invoice.payments.map((payment) => (
                    <Button key={payment.id} asChild size="sm" variant="ghost">
                      <a href={`/api/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">
                        Receipt
                      </a>
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
