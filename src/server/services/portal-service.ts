import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requestAppointment, type RequestAppointmentInput } from "@/server/services/appointments-service";
import { getDocumentSignedUrl } from "@/lib/storage";
import { normalizeEmail, normalizePhone } from "@/lib/patients";
import type { CurrentPatient } from "@/lib/auth/patient-session";
import type { UpdatePortalProfileInput } from "@/lib/validation/portal";

/** Every function here takes the patient id only from the caller's own authenticated session
 * (see the (portal) route group's pages) and hard-scopes every query to it — there is no
 * "which patient" parameter a client could ever tamper with. This is the entire security model
 * for the portal: one rule, no exceptions, enforced the same way everywhere. */

export async function getPortalDashboard(patientId: string) {
  const [nextAppointment, latestPrescription, latestLabOrder, latestInvoice] = await Promise.all([
    prisma.appointment.findFirst({
      where: { patientId, status: { in: ["SCHEDULED", "CONFIRMED"] }, date: { gte: new Date() } },
      include: { doctor: { select: { fullName: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.prescription.findFirst({
      where: { patientId, status: "ISSUED" },
      include: { doctor: { select: { fullName: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.labOrder.findFirst({
      where: { patientId, status: "REVIEWED" },
      orderBy: { reviewedAt: "desc" },
    }),
    prisma.invoice.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { nextAppointment, latestPrescription, latestLabOrder, latestInvoice };
}

export async function listPortalAppointments(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId },
    include: { doctor: { select: { fullName: true } } },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });
}

export async function requestPortalAppointment(patient: CurrentPatient, input: RequestAppointmentInput) {
  return requestAppointment(patient.patient.id, input);
}

const portalPrescriptionInclude = {
  patient: true,
  doctor: {
    select: {
      fullName: true,
      staffProfileId: true,
      signatureStoragePath: true,
      licenseNumber: true,
      qualifications: true,
    },
  },
  items: { orderBy: { sortOrder: "asc" as const }, include: { medicine: true } },
} satisfies Prisma.PrescriptionInclude;

/** For the PDF route: `status: "ISSUED"` is baked directly into the WHERE clause (not checked
 * after the fact) so a DRAFT prescription can never be fetched this way regardless of ownership —
 * the query itself IS the enforcement of `canPatientAccessPrescription`. */
export async function getPortalPrescriptionById(patientId: string, id: string) {
  return prisma.prescription.findFirst({
    where: { id, patientId, status: "ISSUED" },
    include: portalPrescriptionInclude,
  });
}

export async function listPortalPrescriptions(patientId: string) {
  return prisma.prescription.findMany({
    where: { patientId, status: "ISSUED" },
    include: { doctor: { select: { fullName: true } }, items: { include: { medicine: true } } },
    orderBy: { issuedAt: "desc" },
  });
}

/** For the PDF route: `status: "REVIEWED"` is baked into the WHERE clause — the "released" gate
 * from `canPatientAccessLabOrder` is enforced by the query itself, not a follow-up check. */
export async function getPortalLabOrderById(patientId: string, id: string) {
  return prisma.labOrder.findFirst({
    where: { id, patientId, status: "REVIEWED" },
    include: {
      patient: { select: { firstName: true, lastName: true, patientId: true, dateOfBirth: true, sex: true } },
      orderedBy: { select: { fullName: true } },
      reviewedBy: { select: { fullName: true } },
      items: { include: { labTest: { select: { name: true, category: true } } } },
    },
  });
}

export async function listPortalLabOrders(patientId: string) {
  return prisma.labOrder.findMany({
    where: { patientId, status: "REVIEWED" },
    include: { items: { include: { labTest: true } } },
    orderBy: { reviewedAt: "desc" },
  });
}

export async function listPortalDocuments(patientId: string) {
  const documents = await prisma.document.findMany({
    where: { patientId, status: "ACTIVE" },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    documents.map(async (doc) => ({ ...doc, signedUrl: await getDocumentSignedUrl(doc.storagePath) })),
  );
}

/** Invoices/receipts have no release-status gate — ownership alone (see
 * `canPatientAccessInvoice`), so the WHERE clause need only match `patientId`. */
export async function getPortalInvoiceById(patientId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, patientId },
    include: {
      patient: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getPortalPaymentById(patientId: string, id: string) {
  return prisma.payment.findFirst({
    where: { id, invoice: { patientId } },
    include: {
      recordedBy: { select: { fullName: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          totalCents: true,
          paidCents: true,
          patient: { select: { firstName: true, lastName: true, patientId: true } },
        },
      },
    },
  });
}

export async function listPortalInvoices(patientId: string) {
  return prisma.invoice.findMany({
    where: { patientId },
    include: { payments: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePortalProfile(patient: CurrentPatient, input: UpdatePortalProfileInput) {
  return prisma.patient.update({
    where: { id: patient.patient.id },
    data: {
      phone: input.phone,
      normalizedPhone: normalizePhone(input.phone),
      email: input.email || null,
      normalizedEmail: input.email ? normalizeEmail(input.email) : null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      state: input.state || null,
      postalCode: input.postalCode || null,
      country: input.country || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      emergencyContactRelationship: input.emergencyContactRelationship || null,
    },
  });
}
