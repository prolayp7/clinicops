import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";
import { NewInvoiceForm } from "../_components/new-invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "billing:manage-invoices")) {
    redirect("/billing");
  }

  const params = await searchParams;

  const patients = await prisma.patient.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, patientId: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">New Invoice</h1>
        <p className="text-muted-foreground text-body">Select a patient, then add charges.</p>
      </div>
      <Card className="max-w-2xl p-6">
        <NewInvoiceForm patients={patients} defaultPatientId={params.patientId} />
      </Card>
    </div>
  );
}
