import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { getInvoiceById } from "@/server/services/invoices-service";

export default async function InvoicePdfPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "billing:view")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invoice = await getInvoiceById(actor, id);
  if (!invoice) notFound();

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title text-foreground font-bold">Invoice PDF</h1>
          <p className="text-muted-foreground text-body">{invoice.invoiceNumber}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/billing/${invoice.id}`}>
            <ArrowLeft className="size-4" />
            Back to invoice
          </Link>
        </Button>
      </div>

      <Card className="min-h-[65vh] flex-1 overflow-hidden p-0">
        <iframe
          title={`PDF preview for invoice ${invoice.invoiceNumber}`}
          src={`/api/invoices/${invoice.id}/pdf`}
          className="h-[calc(100vh-14rem)] min-h-[65vh] w-full border-0 bg-white"
        />
      </Card>
    </div>
  );
}
