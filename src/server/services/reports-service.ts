import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import { formatCents } from "@/lib/billing";
import { REPORT_LABELS, type ReportType } from "@/lib/reports";
import { getRevenueSummary } from "@/server/services/invoices-service";
import type { CurrentUser } from "@/lib/auth/session";

export type ReportRow = Record<string, string | number>;
export type ReportResult = {
  title: string;
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  secondaryTitle?: string;
  secondaryColumns?: { key: string; label: string }[];
  secondaryRows?: ReportRow[];
};

export type ReportRange = { from: Date; to: Date };

async function patientRegistrationsReport(range: ReportRange): Promise<ReportResult> {
  const patients = await prisma.patient.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    orderBy: { createdAt: "asc" },
  });
  return {
    title: REPORT_LABELS["patient-registrations"],
    columns: [
      { key: "patientId", label: "Patient ID" },
      { key: "name", label: "Name" },
      { key: "sex", label: "Sex" },
      { key: "phone", label: "Phone" },
      { key: "registeredAt", label: "Registered" },
    ],
    rows: patients.map((p) => ({
      patientId: p.patientId,
      name: `${p.firstName} ${p.lastName}`,
      sex: p.sex,
      phone: p.phone,
      registeredAt: p.createdAt.toISOString().slice(0, 10),
    })),
  };
}

async function doctorAppointmentsReport(range: ReportRange): Promise<ReportResult> {
  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: range.from, lte: range.to } },
    include: {
      doctor: { select: { fullName: true } },
      patient: { select: { firstName: true, lastName: true, patientId: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return {
    title: REPORT_LABELS["doctor-appointments"],
    columns: [
      { key: "date", label: "Date" },
      { key: "doctor", label: "Doctor" },
      { key: "patient", label: "Patient" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
    ],
    rows: appointments.map((a) => ({
      date: a.date.toISOString().slice(0, 10),
      doctor: a.doctor.fullName,
      patient: `${a.patient.firstName} ${a.patient.lastName} (${a.patient.patientId})`,
      status: a.status,
      source: a.source,
    })),
  };
}

async function appointmentStatusReport(range: ReportRange): Promise<ReportResult> {
  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where: { date: { gte: range.from, lte: range.to } },
    _count: true,
  });
  return {
    title: REPORT_LABELS["appointment-status"],
    columns: [
      { key: "status", label: "Status" },
      { key: "count", label: "Count" },
    ],
    rows: grouped.map((g) => ({ status: g.status, count: g._count })),
  };
}

async function consultationVolumeReport(range: ReportRange): Promise<ReportResult> {
  const consultations = await prisma.consultation.findMany({
    where: { status: "COMPLETED", completedAt: { gte: range.from, lte: range.to } },
    include: { doctor: { select: { fullName: true } } },
  });
  const byDoctor = new Map<string, number>();
  for (const c of consultations) {
    byDoctor.set(c.doctor.fullName, (byDoctor.get(c.doctor.fullName) ?? 0) + 1);
  }
  return {
    title: REPORT_LABELS["consultation-volume"],
    columns: [
      { key: "doctor", label: "Doctor" },
      { key: "count", label: "Completed Consultations" },
    ],
    rows: Array.from(byDoctor.entries()).map(([doctor, count]) => ({ doctor, count })),
  };
}

async function labTestActivityReport(range: ReportRange): Promise<ReportResult> {
  const items = await prisma.labOrderItem.findMany({
    where: { labOrder: { createdAt: { gte: range.from, lte: range.to } } },
    include: { labTest: { select: { name: true, category: true } } },
  });
  const byTest = new Map<string, { category: string; count: number }>();
  for (const item of items) {
    const key = item.labTest.name;
    const existing = byTest.get(key);
    if (existing) existing.count += 1;
    else byTest.set(key, { category: item.labTest.category, count: 1 });
  }
  return {
    title: REPORT_LABELS["lab-test-activity"],
    columns: [
      { key: "test", label: "Test" },
      { key: "category", label: "Category" },
      { key: "count", label: "Times Ordered" },
    ],
    rows: Array.from(byTest.entries()).map(([test, v]) => ({ test, category: v.category, count: v.count })),
  };
}

async function paymentsOutstandingReport(range: ReportRange): Promise<ReportResult> {
  const [payments, outstandingInvoices] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      include: {
        invoice: { select: { invoiceNumber: true, patient: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      include: { patient: { select: { firstName: true, lastName: true, patientId: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    title: "Payments Received",
    columns: [
      { key: "date", label: "Date" },
      { key: "invoice", label: "Invoice" },
      { key: "patient", label: "Patient" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount" },
    ],
    rows: payments.map((p) => ({
      date: p.createdAt.toISOString().slice(0, 10),
      invoice: p.invoice.invoiceNumber,
      patient: `${p.invoice.patient.firstName} ${p.invoice.patient.lastName}`,
      method: p.method,
      amount: formatCents(p.amountCents),
    })),
    secondaryTitle: "Currently Outstanding",
    secondaryColumns: [
      { key: "invoice", label: "Invoice" },
      { key: "patient", label: "Patient" },
      { key: "status", label: "Status" },
      { key: "balance", label: "Balance" },
    ],
    secondaryRows: outstandingInvoices.map((inv) => ({
      invoice: inv.invoiceNumber,
      patient: `${inv.patient.firstName} ${inv.patient.lastName} (${inv.patient.patientId})`,
      status: inv.status,
      balance: formatCents(inv.totalCents - inv.paidCents),
    })),
  };
}

async function revenueSummaryReport(actor: CurrentUser, range: ReportRange): Promise<ReportResult> {
  const summary = await getRevenueSummary(actor, range);
  return {
    title: REPORT_LABELS["revenue-summary"],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" },
    ],
    rows: [
      { metric: "Invoices issued", value: summary.invoiceCount },
      { metric: "Total invoiced", value: formatCents(summary.totalInvoicedCents) },
      { metric: "Total collected (net of refunds)", value: formatCents(summary.totalCollectedCents) },
      { metric: "Total refunded", value: formatCents(summary.totalRefundedCents) },
      { metric: "Total outstanding (all time)", value: formatCents(summary.totalOutstandingCents) },
    ],
  };
}

export async function getReport(
  actor: CurrentUser,
  type: ReportType,
  range: ReportRange,
): Promise<ReportResult> {
  assertCan(actor.profile.role, "reports:view");

  switch (type) {
    case "patient-registrations":
      return patientRegistrationsReport(range);
    case "doctor-appointments":
      return doctorAppointmentsReport(range);
    case "appointment-status":
      return appointmentStatusReport(range);
    case "consultation-volume":
      return consultationVolumeReport(range);
    case "lab-test-activity":
      return labTestActivityReport(range);
    case "payments-outstanding":
      return paymentsOutstandingReport(range);
    case "revenue-summary":
      return revenueSummaryReport(actor, range);
  }
}
