import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { getPaymentById } from "@/server/services/invoices-service";
import { getPortalPaymentById } from "@/server/services/portal-service";
import { renderReceiptPdf } from "@/server/pdf/receipt-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staffActor = await getCurrentUser();
  const patientActor = staffActor ? null : await getCurrentPatient();
  if (!staffActor && !patientActor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let payment;
  if (staffActor) {
    try {
      payment = await getPaymentById(staffActor, id);
    } catch {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else {
    // `getPortalPaymentById` bakes `invoice.patientId` ownership into its WHERE clause.
    payment = await getPortalPaymentById(patientActor!.patient.id, id);
  }
  if (!payment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const clinic = await getClinicSettings();
  if (!clinic) {
    return NextResponse.json({ error: "Clinic profile has not been configured yet." }, { status: 500 });
  }

  const pdfBuffer = await renderReceiptPdf(payment, clinic);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${payment.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
