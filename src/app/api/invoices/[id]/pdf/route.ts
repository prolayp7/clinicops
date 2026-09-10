import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { getInvoiceById } from "@/server/services/invoices-service";
import { getPortalInvoiceById } from "@/server/services/portal-service";
import { renderInvoicePdf } from "@/server/pdf/invoice-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staffActor = await getCurrentUser();
  const patientActor = staffActor ? null : await getCurrentPatient();
  if (!staffActor && !patientActor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let invoice;
  if (staffActor) {
    try {
      invoice = await getInvoiceById(staffActor, id);
    } catch {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else {
    // `getPortalInvoiceById` bakes ownership into its WHERE clause — a null result already
    // means "not yours".
    invoice = await getPortalInvoiceById(patientActor!.patient.id, id);
  }
  if (!invoice) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const clinic = await getClinicSettings();
  if (!clinic) {
    return NextResponse.json({ error: "Clinic profile has not been configured yet." }, { status: 500 });
  }

  const pdfBuffer = await renderInvoicePdf(invoice, clinic);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
