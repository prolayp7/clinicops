import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { getPrescriptionById } from "@/server/services/prescriptions-service";
import { getPortalPrescriptionById } from "@/server/services/portal-service";
import { getSignatureDataUri } from "@/lib/storage";
import { renderPrescriptionPdf } from "@/server/pdf/prescription-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staffActor = await getCurrentUser();
  const patientActor = staffActor ? null : await getCurrentPatient();
  if (!staffActor && !patientActor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let prescription;
  if (staffActor) {
    try {
      prescription = await getPrescriptionById(staffActor, id);
    } catch {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (prescription && prescription.status !== "ISSUED") {
      return NextResponse.json({ error: "Only an issued prescription can be printed." }, { status: 400 });
    }
  } else {
    // `getPortalPrescriptionById` bakes ownership + ISSUED status into its WHERE clause, so a
    // null result here already means "not yours, or not released" — no separate check needed.
    prescription = await getPortalPrescriptionById(patientActor!.patient.id, id);
  }
  if (!prescription) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const clinic = await getClinicSettings();
  if (!clinic) {
    return NextResponse.json({ error: "Clinic profile has not been configured yet." }, { status: 500 });
  }
  const signatureDataUri = prescription.doctor.signatureStoragePath
    ? await getSignatureDataUri(prescription.doctor.signatureStoragePath)
    : null;

  const pdfBuffer = await renderPrescriptionPdf(prescription, clinic, signatureDataUri);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prescription.prescriptionNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
