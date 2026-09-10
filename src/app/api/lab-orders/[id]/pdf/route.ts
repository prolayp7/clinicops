import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { getLabOrderById } from "@/server/services/lab-orders-service";
import { getPortalLabOrderById } from "@/server/services/portal-service";
import { renderLabReportPdf } from "@/server/pdf/lab-report-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staffActor = await getCurrentUser();
  const patientActor = staffActor ? null : await getCurrentPatient();
  if (!staffActor && !patientActor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let order;
  if (staffActor) {
    try {
      order = await getLabOrderById(staffActor, id);
    } catch {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else {
    // `getPortalLabOrderById` bakes ownership + REVIEWED ("released") status into its WHERE
    // clause — a null result already means "not yours, or not released yet".
    order = await getPortalLabOrderById(patientActor!.patient.id, id);
  }
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const clinic = await getClinicSettings();
  if (!clinic) {
    return NextResponse.json({ error: "Clinic profile has not been configured yet." }, { status: 500 });
  }

  const pdfBuffer = await renderLabReportPdf(order, clinic);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.orderNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
