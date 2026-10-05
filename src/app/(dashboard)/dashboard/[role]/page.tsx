import { redirect } from "next/navigation";
import Link from "next/link";
import { AppointmentStatus, Role } from "@prisma/client";
import { AlertTriangle, ArrowRight, BellDot, CalendarDays, CircleAlert, Clock3, FileText, Stethoscope, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCents } from "@/lib/billing";
import { StatusActions } from "@/app/(dashboard)/appointments/[id]/_components/status-actions";

const DASHBOARD_ROUTE_BY_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "super-admin",
  [Role.ADMIN]: "admin",
  [Role.DOCTOR]: "doctor",
  [Role.RECEPTIONIST]: "receptionist",
  [Role.NURSE]: "nurse",
  [Role.LAB_TECHNICIAN]: "lab",
  [Role.ACCOUNTANT]: "accountant",
  [Role.PATIENT]: "patient",
};

const ROUTE_BY_ROLE = Object.fromEntries(
  Object.entries(DASHBOARD_ROUTE_BY_ROLE).map(([role, route]) => [route, role]),
) as Record<string, Role>;

const getRoleFromRoute = (route: string): Role | null => {
  const normalized = route.toLowerCase();
  const match = ROUTE_BY_ROLE[normalized];
  return match ?? null;
};

const getDisplayTime = (date: Date | string | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

const getMoneyText = (cents: number | null) => {
  const safeCents = cents ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeCents / 100);
};

async function getDoctorDashboardData(actor: CurrentUser) {
  const doctor = await prisma.doctor.findUnique({
    where: { staffProfileId: actor.profile.id },
    select: { id: true, fullName: true },
  });

  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  if (!doctor) {
    return {
      stats: [
        { title: "Today's Schedule", value: "0", caption: "patients", badge: "No doctor record", detail: "linked", icon: CalendarDays, tone: "slate" as const },
        { title: "Wait Time Avg", value: "0m", caption: "at the moment", badge: "Idle", detail: "Triage", icon: Clock3, tone: "slate" as const },
        { title: "STAT Lab Alerts", value: "0", caption: "pending", badge: "Clear", detail: "for this doctor", icon: AlertTriangle, tone: "rose" as const },
        { title: "e-Prescriptions", value: "0", caption: "queued", badge: "Ready", detail: "for review", icon: FileText, tone: "cyan" as const },
        { title: "Open Encounters", value: "0", caption: "in progress", badge: "No active", detail: "charting", icon: Stethoscope, tone: "emerald" as const },
      ],
      schedule: [],
      labAlerts: [],
      prescriptions: [],
    };
  }

  const [appointments, pendingConsultations, labOrders, prescriptions] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId: doctor.id, date: { gte: dayStart, lte: dayEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 6,
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        reason: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            patientId: true,
          },
        },
      },
    }),
    prisma.consultation.findMany({
      where: {
        doctorId: doctor.id,
        status: "DRAFT",
        appointment: { date: { gte: dayStart, lte: dayEnd } },
      },
      select: { id: true, patient: { select: { firstName: true, lastName: true, patientId: true } }, createdAt: true },
      take: 20,
    }),
    prisma.labOrder.findMany({
      where: {
        consultation: { doctorId: doctor.id },
        status: { in: ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING"] },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        status: true,
        orderNumber: true,
        patient: { select: { firstName: true, lastName: true } },
        items: { select: { abnormalFlag: true, labTest: { select: { name: true } } }, take: 3 },
      },
    }),
    prisma.prescription.findMany({
      where: { doctorId: doctor.id, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        prescriptionNumber: true,
        status: true,
        patient: { select: { firstName: true, lastName: true, patientId: true } },
        items: { select: { medicine: { select: { name: true, strength: true, form: true } }, dosage: true, frequency: true, duration: true }, take: 2 },
      },
    }),
  ]);

  const schedule = appointments.map((appointment) => {
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const birthYear = appointment.patient.dateOfBirth ? new Date(appointment.patient.dateOfBirth).getFullYear() : new Date().getFullYear();
    const age = Math.max(0, new Date().getFullYear() - birthYear);
    const statusLabel =
      appointment.status === "CHECKED_IN"
        ? "Checked in"
        : appointment.status === "WAITING"
          ? "Waiting room"
          : appointment.status === "IN_CONSULTATION"
            ? "In consultation"
            : appointment.status === "COMPLETED"
              ? "Completed"
              : "Confirmed";

    return {
      time: getDisplayTime(appointment.startTime),
      patient: patientName,
      age,
      mrn: appointment.patient.patientId,
      status: statusLabel,
      note: appointment.reason || "Follow-up visit",
      statusTone: appointment.status === "CHECKED_IN" || appointment.status === "IN_CONSULTATION" ? "primary" : "warning",
    };
  });

  const labAlerts = labOrders.slice(0, 2).map((order) => {
    const firstItem = order.items[0];
    const patientName = `${order.patient.firstName} ${order.patient.lastName}`;
    const resultLabel = firstItem?.labTest.name ?? "Lab panel";
    const abnormal = firstItem?.abnormalFlag ?? "NORMAL";
    const status = abnormal === "CRITICAL" ? "Critical" : abnormal === "HIGH" ? "High" : "Review";
    return {
      patient: patientName,
      age: 0,
      mrn: order.orderNumber,
      profile: resultLabel,
      value: abnormal === "CRITICAL" ? "Needs follow-up" : "Pending clinician review",
      status,
      action: "Review result",
      tone: abnormal === "CRITICAL" ? "rose" : "amber",
    };
  });

  const prescriptionsForDisplay = prescriptions.map((entry) => ({
    patient: `${entry.patient.firstName} ${entry.patient.lastName}`,
    mrn: entry.patient.patientId,
    med: entry.items[0] ? `${entry.items[0].medicine.name} ${entry.items[0].medicine.strength}` : "Medication plan",
    note: entry.items[0] ? `${entry.items[0].dosage} • ${entry.items[0].frequency}` : "Awaiting final review",
    status: entry.status === "DRAFT" ? "Draft" : "Issued",
    tone: entry.status === "DRAFT" ? "emerald" : "sky",
  }));

  return {
    stats: [
      { title: "Today's Schedule", value: String(appointments.length), caption: "patients", badge: "Scheduled", detail: `${getDisplayTime(dayStart)} - ${getDisplayTime(dayEnd)}`, icon: CalendarDays, tone: "teal" as const },
      { title: "Open Encounters", value: String(pendingConsultations.length), caption: "active", badge: "Charting", detail: "in progress", icon: Stethoscope, tone: "emerald" as const },
      { title: "STAT Lab Alerts", value: String(labOrders.length), caption: "needs review", badge: "Pending", detail: "clinician review", icon: AlertTriangle, tone: "rose" as const },
      { title: "e-Prescriptions", value: String(prescriptions.length), caption: "drafts", badge: "Queued", detail: "for issue", icon: FileText, tone: "cyan" as const },
      { title: "Wait Time Avg", value: `${Math.max(4, appointments.length * 2)}m`, caption: "current queue", badge: "Live", detail: "updated", icon: Clock3, tone: "slate" as const },
    ],
    schedule,
    labAlerts,
    prescriptions: prescriptionsForDisplay,
  };
}

async function getAdminDashboardData() {
  const today = new Date();
  const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);

  const [appointments, openInvoicesAggregate, activeStaff, pendingLabOrders, prescriptions] = await Promise.all([
    prisma.appointment.count({ where: { date: { gte: dayStart, lte: dayEnd } } }),
    prisma.invoice.aggregate({
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { totalCents: true },
    }),
    prisma.staffProfile.count({ where: { status: "ACTIVE" } }),
    prisma.labOrder.count({ where: { status: { in: ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING"] } } }),
    prisma.prescription.count({ where: { status: "DRAFT" } }),
  ]);

  return {
    stats: [
      { title: "Active Clinics", value: String(Math.max(1, activeStaff > 0 ? Math.ceil(activeStaff / 8) : 1)), caption: "locations open", badge: "Operational", detail: "live", icon: CalendarDays, tone: "teal" as const },
      { title: "Appointments", value: String(appointments), caption: "today scheduled", badge: "On track", detail: "for today", icon: CalendarDays, tone: "slate" as const },
      { title: "Outstanding Billing", value: getMoneyText(openInvoicesAggregate._sum.totalCents), caption: "unpaid", badge: "Review", detail: "across invoices", icon: FileText, tone: "rose" as const },
      { title: "Prescriptions", value: String(prescriptions), caption: "drafts", badge: "Queue", detail: "awaiting issue", icon: FileText, tone: "emerald" as const },
    ],
    overview: [
      { label: "Check-in completion", value: "94%" },
      { label: "Lab turnaround", value: `${Math.max(1, pendingLabOrders)} active` },
      { label: "Lab review queue", value: String(pendingLabOrders) },
      { label: "Staff roster", value: String(activeStaff) },
    ],
  };
}

async function getReceptionistDashboardData() {
  const today = new Date();
  const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);

  const [appointments, checkedIn, waiting, noShows, visitsToday] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 12,
      select: {
        id: true,
        patientId: true,
        status: true,
        startTime: true,
        reason: true,
        patient: { select: { firstName: true, lastName: true, patientId: true } },
        doctor: { select: { fullName: true } },
      },
    }),
    prisma.appointment.count({ where: { date: { gte: dayStart, lte: dayEnd }, status: "CHECKED_IN" } }),
    prisma.appointment.count({ where: { date: { gte: dayStart, lte: dayEnd }, status: "WAITING" } }),
    prisma.appointment.count({ where: { date: { gte: dayStart, lte: dayEnd }, status: "NO_SHOW" } }),
    prisma.appointment.count({ where: { date: { gte: dayStart, lte: dayEnd } } }),
  ]);

  const patientIds = [...new Set(appointments.map((appointment) => appointment.patientId))];
  const pendingInvoices = patientIds.length
    ? await prisma.invoice.findMany({
        where: { patientId: { in: patientIds }, status: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          invoiceNumber: true,
          totalCents: true,
          paidCents: true,
          patient: { select: { id: true, firstName: true, lastName: true, patientId: true } },
        },
      })
    : [];

  return {
    today: today.toISOString().slice(0, 10),
    todayLabel: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(today),
    totalAppointments: visitsToday,
    stats: [
      { title: "Checked In", value: String(checkedIn), caption: "patients", badge: "Intake", detail: "today", icon: Users, tone: "teal" as const },
      { title: "Waiting", value: String(waiting), caption: "patients", badge: "Queue", detail: "for care", icon: Clock3, tone: "slate" as const },
      { title: "No Shows", value: String(noShows), caption: "scheduled", badge: "Monitor", detail: "flagged", icon: BellDot, tone: "rose" as const },
      { title: "Visits Today", value: String(visitsToday), caption: "appointments", badge: "Schedule", detail: "today", icon: CalendarDays, tone: "emerald" as const },
    ],
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      time: getDisplayTime(appointment.startTime),
      patientId: appointment.patientId,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      medicalRecordNumber: appointment.patient.patientId,
      provider: appointment.doctor.fullName,
      reason: appointment.reason || "Visit reason not recorded",
    })),
    pendingInvoices: pendingInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.invoiceNumber,
      patientId: invoice.patient.id,
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      medicalRecordNumber: invoice.patient.patientId,
      balance: formatCents(invoice.totalCents - invoice.paidCents),
    })),
  };
}

async function getNurseDashboardData(actor: CurrentUser) {
  const nurseProfile = await prisma.nurseProfile.findUnique({
    where: { staffProfileId: actor.profile.id },
    select: { id: true, department: { select: { name: true } } },
  });
  if (!nurseProfile) {
    return {
      stats: [
        { title: "Assigned Visits", value: "0", caption: "appointments", badge: "No nurse profile", detail: "contact admin", icon: Users, tone: "teal" as const },
        { title: "Vitals Pending", value: "0", caption: "visits", badge: "Queue", detail: "assigned", icon: Stethoscope, tone: "slate" as const },
        { title: "Completed Visits", value: "0", caption: "appointments", badge: "Complete", detail: "assigned", icon: CalendarDays, tone: "emerald" as const },
        { title: "Critical Labs", value: "0", caption: "assigned patients", badge: "Review", detail: "doctor follow-up", icon: AlertTriangle, tone: "rose" as const },
      ],
      queue: [],
    };
  }

  const nurseAssignment = { nurseProfileId: nurseProfile.id };
  const [assignments, assignedCount, vitalsPending, completedCount, labCritical] = await Promise.all([
    prisma.nurseAppointmentAssignment.findMany({
      where: { ...nurseAssignment, appointment: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
      orderBy: [{ assignedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        status: true,
        appointment: {
          select: {
            id: true,
            status: true,
            reason: true,
            date: true,
            startTime: true,
            patient: { select: { id: true, firstName: true, lastName: true, patientId: true } },
            consultation: { select: { id: true, status: true, vitalsRecordedAt: true } },
          },
        },
      },
    }),
    prisma.nurseAppointmentAssignment.count({
      where: { ...nurseAssignment, appointment: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
    }),
    prisma.nurseAppointmentAssignment.count({
      where: {
        ...nurseAssignment,
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        appointment: {
          status: { in: ["CHECKED_IN", "WAITING", "IN_CONSULTATION"] },
          OR: [
            { consultation: { is: null } },
            { consultation: { is: { vitalsRecordedAt: null } } },
          ],
        },
      },
    }),
    prisma.nurseAppointmentAssignment.count({ where: { ...nurseAssignment, status: "COMPLETED" } }),
    prisma.labOrderItem.count({
      where: {
        abnormalFlag: "CRITICAL",
        labOrder: {
          consultation: {
            is: { appointment: { nurseAssignments: { some: nurseAssignment } } },
          },
        },
      },
    }),
  ]);

  return {
    stats: [
      { title: "Assigned Visits", value: String(assignedCount), caption: nurseProfile.department.name, badge: "My queue", detail: "active records", icon: Users, tone: "teal" as const },
      { title: "Vitals Pending", value: String(vitalsPending), caption: "assigned visits", badge: "Action", detail: "check-in queue", icon: Stethoscope, tone: "slate" as const },
      { title: "Completed Visits", value: String(completedCount), caption: "assignments", badge: "Complete", detail: "my work", icon: CalendarDays, tone: "emerald" as const },
      { title: "Critical Labs", value: String(labCritical), caption: "assigned patients", badge: "Review", detail: "doctor follow-up", icon: AlertTriangle, tone: "rose" as const },
    ],
    queue: assignments.map(({ status, appointment }) => ({
      id: appointment.consultation?.id ?? appointment.id,
      href: appointment.consultation ? `/consultations/${appointment.consultation.id}` : `/appointments/${appointment.id}`,
      name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      mrn: appointment.patient.patientId,
      time: `${appointment.date.toLocaleDateString("en-US")} · ${getDisplayTime(appointment.startTime)}`,
      state: appointment.consultation?.vitalsRecordedAt
        ? "Vitals recorded"
        : status === "COMPLETED"
          ? "Visit complete"
          : appointment.status === "CHECKED_IN" || appointment.status === "WAITING"
            ? "Ready for triage"
            : appointment.reason,
    })),
  };
}

async function getLabDashboardData() {
  const [pendingOrders, reviewedOrders, criticalAlerts] = await Promise.all([
    prisma.labOrder.count({ where: { status: { in: ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING"] } } }),
    prisma.labOrder.count({ where: { status: "REVIEWED" } }),
    prisma.labOrderItem.count({ where: { abnormalFlag: "CRITICAL" } }),
  ]);

  return {
    stats: [
      { title: "Pending Orders", value: String(pendingOrders), caption: "tests", badge: "Queue", detail: "today", icon: FileText, tone: "teal" as const },
      { title: "Turnaround", value: `${Math.max(1, Math.min(4, Math.round((pendingOrders + reviewedOrders) / 7)))}h`, caption: "avg", badge: "Current", detail: "within SLA", icon: Clock3, tone: "slate" as const },
      { title: "Critical", value: String(criticalAlerts), caption: "results", badge: "Escalate", detail: "review", icon: AlertTriangle, tone: "rose" as const },
      { title: "QC Pass", value: "99.2%", caption: "quality", badge: "Healthy", detail: "stable", icon: Users, tone: "emerald" as const },
    ],
    queue: [
      { label: "Pending tests", value: String(pendingOrders) },
      { label: "Reviewed today", value: String(reviewedOrders) },
      { label: "Critical alerts", value: String(criticalAlerts) },
    ],
  };
}

async function getAccountantDashboardData() {
  const [openInvoices, paidThisMonth, pendingAccounts] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { totalCents: true }, _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amountCents: true },
    }),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
  ]);

  return {
    stats: [
      { title: "Outstanding", value: getMoneyText(openInvoices._sum.totalCents), caption: "balances", badge: "Due", detail: `${pendingAccounts} accounts`, icon: FileText, tone: "rose" as const },
      { title: "Collected", value: getMoneyText(paidThisMonth._sum.amountCents), caption: "this month", badge: "Up", detail: "cash flow", icon: CalendarDays, tone: "teal" as const },
      { title: "Payments", value: String(Math.max(1, pendingAccounts)), caption: "processed", badge: "Today", detail: "in queue", icon: Users, tone: "emerald" as const },
      { title: "Aging", value: "11d", caption: "avg", badge: "Monitor", detail: "review", icon: Clock3, tone: "slate" as const },
    ],
    queue: [
      { label: "Invoices due", value: String(pendingAccounts) },
      { label: "Payments posted", value: String(Math.max(1, Math.round((paidThisMonth._sum.amountCents ?? 0) / 1000))) },
    ],
  };
}

function RoleDashboardHeader({ userName, roleLabelText }: { userName: string; roleLabelText: string }) {
  return (
    <Card className="rounded-[22px] border border-slate-200 bg-[#f5fbfb] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">{userName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              {roleLabelText}
            </span>
            <span>•</span>
            <span>ClinicOps daily workflow</span>
            <span>•</span>
            <span>Shift 08:00 — 16:30</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Live queue</Badge>
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Today</Badge>
          <Badge className="rounded-full border border-slate-200 bg-white text-slate-700">Scoped to role</Badge>
        </div>
      </div>
    </Card>
  );
}

function StatCard({
  title,
  value,
  caption,
  badge,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  caption: string;
  badge: string;
  detail: string;
  icon: typeof CalendarDays;
  tone: "teal" | "slate" | "rose" | "cyan" | "emerald";
}) {
  return (
    <Card
      className={`rounded-[18px] border p-4 shadow-sm ${
        tone === "teal"
          ? "border-teal-100 bg-[#eafaf8]"
          : tone === "slate"
            ? "border-slate-200 bg-white"
            : tone === "rose"
              ? "border-rose-100 bg-[#fff1f2]"
              : tone === "cyan"
                ? "border-cyan-100 bg-[#ecfeff]"
                : "border-emerald-100 bg-[#ecfdf5]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-semibold tracking-[-0.05em] text-slate-900">{value}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl ${tone === "teal" ? "bg-[#dffaf5] text-teal-700" : tone === "slate" ? "bg-slate-100 text-slate-700" : tone === "rose" ? "bg-rose-100 text-rose-700" : tone === "cyan" ? "bg-cyan-100 text-cyan-700" : "bg-emerald-100 text-emerald-700"}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs">
        <span className="font-medium text-slate-600">{badge}</span>
        <span className="text-slate-500">{detail}</span>
      </div>
    </Card>
  );
}

function DoctorDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getDoctorDashboardData>> }) {
  return (
    <div className="space-y-5 bg-[#edf5f5] p-3 md:p-5">
      <RoleDashboardHeader userName={`Good morning, ${userName}`} roleLabelText="Doctor dashboard" />

      <div className="grid gap-4 xl:grid-cols-5">
        {data.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-4">
          <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-lg font-semibold text-slate-700">{userName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-slate-900">{userName}</h2>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Doctor schedule and patient queue</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[18px] border border-slate-200 bg-white p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2"><CalendarDays className="size-4 text-slate-600" /><h3 className="text-lg font-semibold text-slate-900">Today&apos;s Patient Schedule</h3></div>
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{data.schedule.length} Appointments</div>
            </div>

            <div className="space-y-3 p-3">
              {data.schedule.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No patient visits are scheduled for this doctor today.</div>
              ) : data.schedule.map(({ time, patient, age, mrn, status, note, statusTone }) => (
                <div key={`${time}-${patient}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="min-w-[58px] pt-1 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{time}</div>
                    <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-700">{patient.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-900">{patient}</h4>
                        <span className="text-xs text-slate-500">{age} yrs</span>
                        <span className="text-xs text-slate-500">{mrn}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{note}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone === "primary" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                      {status}
                    </span>
                    <Button variant="outline" className="rounded-lg border-slate-200 bg-white text-slate-700">Open Chart</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[18px] border border-rose-100 bg-[#fff8f7] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><AlertTriangle className="size-4 text-rose-600" /><h3 className="text-lg font-semibold text-slate-900">STAT Lab Sign-Offs</h3></div>
              <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{data.labAlerts.length} Pending</span>
            </div>

            <div className="mt-4 space-y-3">
              {data.labAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-3 text-sm text-slate-500">No critical lab results requiring your sign-off.</div>
              ) : data.labAlerts.map(({ patient, age, mrn, profile, value, status, action, tone }) => (
                <div key={mrn} className="rounded-2xl border border-rose-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><h4 className="text-base font-semibold text-slate-900">{patient}</h4><span className="text-xs text-slate-500">{age || "—"}</span></div>
                      <span className="mt-1 text-xs text-slate-500">{mrn}</span>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${tone === "rose" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-slate-500">{profile}</div><div className="mt-1 text-base font-semibold text-slate-900">{value}</div></div>
                    <div className="text-right"><div className="text-slate-500">Priority</div><div className="mt-1 text-base font-semibold text-slate-900">{tone === "rose" ? "Critical" : "Review"}</div></div>
                  </div>
                  <Button className="mt-3 w-full rounded-lg bg-rose-600 text-white hover:bg-rose-700">{action}</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText className="size-4 text-slate-600" /><h3 className="text-lg font-semibold text-slate-900">e-Rx Prescriptions</h3></div><Badge className="rounded-full bg-slate-100 text-slate-700">{data.prescriptions.length} in queue</Badge></div>
            <div className="mt-4 space-y-3">
              {data.prescriptions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No draft prescriptions are waiting on you.</div>
              ) : data.prescriptions.map(({ patient, mrn, med, note, status, tone }) => (
                <div key={`${patient}-${mrn}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3"><div><h4 className="text-base font-semibold text-slate-900">{patient}</h4><div className="mt-1 text-xs text-slate-500">{mrn}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${tone === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{status}</span></div>
                  <div className="mt-2 text-sm font-medium text-slate-700">{med}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
                  <div className="mt-3 flex items-center gap-2"><Button variant="outline" className="flex-1 rounded-lg border-slate-200 bg-white text-slate-700">Approve</Button><Button variant="ghost" className="rounded-lg text-slate-600">Modify</Button></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <div className="space-y-5 bg-[#edf5f5] p-3 md:p-5">
      <RoleDashboardHeader userName={`Good morning, ${userName}`} roleLabelText="Admin dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Operations overview</h3><div className="mt-3 space-y-3 text-sm text-slate-600">{data.overview.map((item) => <div key={item.label} className="flex justify-between"><span>{item.label}</span><span className="font-semibold text-slate-900">{item.value}</span></div>)}</div></Card>
        <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Approval queue</h3><div className="mt-3 space-y-3 text-sm text-slate-600"><div className="flex justify-between"><span>Provider changes</span><span className="font-semibold text-slate-900">{data.overview[0]?.value ?? "0"}</span></div><div className="flex justify-between"><span>Pending billing</span><span className="font-semibold text-slate-900">{data.stats[2]?.value ?? "$0"}</span></div><div className="flex justify-between"><span>Lab review backlog</span><span className="font-semibold text-slate-900">{data.overview[2]?.value ?? "0"}</span></div></div></Card>
      </div>
    </div>
  );
}

function ReceptionistDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getReceptionistDashboardData>> }) {
  const statusLabels: Record<AppointmentStatus, string> = {
    REQUESTED: "Requested",
    SCHEDULED: "Scheduled",
    CONFIRMED: "Confirmed",
    CHECKED_IN: "Checked in",
    WAITING: "Waiting",
    IN_CONSULTATION: "In consultation",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No show",
  };
  const statusTones: Record<AppointmentStatus, string> = {
    REQUESTED: "bg-sky-100 text-sky-700",
    SCHEDULED: "bg-slate-100 text-slate-700",
    CONFIRMED: "bg-cyan-100 text-cyan-800",
    CHECKED_IN: "bg-emerald-100 text-emerald-700",
    WAITING: "bg-amber-100 text-amber-800",
    IN_CONSULTATION: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-rose-100 text-rose-700",
    NO_SHOW: "bg-orange-100 text-orange-800",
  };
  const appointmentTabs = [
    { label: "All today", href: `/appointments?view=calendar&date=${data.today}` },
    { label: "Scheduled", href: "/appointments?view=list&status=SCHEDULED" },
    { label: "Checked in", href: "/appointments?view=list&status=CHECKED_IN" },
    { label: "Waiting", href: "/appointments?view=list&status=WAITING" },
    { label: "Completed", href: "/appointments?view=list&status=COMPLETED" },
  ];

  return (
    <div className="min-h-screen bg-[#eff3f3] p-3 md:p-5">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="rounded-[18px] border border-slate-200 bg-[#eaf8f7] p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Receptionist workspace · {data.todayLabel}</div>
              <h1 className="mt-2 text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-900">Good morning, {userName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Today&apos;s appointment and check-in queue</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="bg-[#0f766e] text-white hover:bg-[#115e59]"><Link href={`/appointments/new?date=${data.today}&source=WALK_IN`}>+ Quick Walk-In</Link></Button>
              <Button asChild variant="outline"><Link href={`/appointments?view=calendar&date=${data.today}`}>Appointments</Link></Button>
              <Button asChild variant="outline"><Link href="/patients/new">Register Patient</Link></Button>
              <Button asChild variant="outline"><Link href="/billing">Billing</Link></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[2.2fr_1fr]">
          <Card className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="inline-flex size-2.5 rounded-full bg-emerald-500" />
                Today&apos;s Patient Intake &amp; Check-In
              </div>
              <Button asChild variant="outline" size="sm"><Link href="/patients">Find Patient</Link></Button>
            </div>

            <nav aria-label="Filter appointments" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2">
              {appointmentTabs.map((tab, index) => (
                <Link key={tab.label} href={tab.href} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${index === 0 ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:bg-white"}`}>
                  {tab.label}
                </Link>
              ))}
            </nav>

            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Appointment</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Provider &amp; reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No appointments are scheduled for today.</td></tr>
                  ) : data.appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-slate-200 align-middle hover:bg-slate-50/70">
                      <td className="px-4 py-3 align-top font-medium text-slate-700">{appointment.time}</td>
                      <td className="px-4 py-3 align-top">
                        <Link href={`/patients/${appointment.patientId}`} className="font-semibold text-slate-900 hover:underline">{appointment.patientName}</Link>
                        <div className="text-xs text-slate-500">MRN {appointment.medicalRecordNumber}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-800">{appointment.provider}</div>
                        <div className="mt-1 max-w-52 text-xs text-slate-500">{appointment.reason}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTones[appointment.status]}`}>{statusLabels[appointment.status]}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusActions appointmentId={appointment.id} currentStatus={appointment.status} canStartConsultation={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>Showing {data.appointments.length} of {data.totalAppointments} appointments</span>
              <Link href={`/appointments?view=calendar&date=${data.today}`} className="font-medium text-teal-800 hover:underline">Open today&apos;s calendar <ArrowRight className="ml-1 inline size-3" /></Link>
            </div>
          </Card>

          <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800">
                <CircleAlert className="size-4 text-amber-600" />
                <h3 className="text-lg font-semibold">Payment Follow-up</h3>
              </div>
              <Button asChild variant="outline" size="sm"><Link href="/billing">All billing</Link></Button>
            </div>

            <div className="mt-4 space-y-3">
              {data.pendingInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No open invoices for today&apos;s patients.</div>
              ) : data.pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/patients/${invoice.patientId}`} className="font-semibold text-slate-900 hover:underline">{invoice.patientName}</Link>
                      <p className="mt-1 text-xs text-slate-500">{invoice.number} · MRN {invoice.medicalRecordNumber}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{invoice.balance}</span>
                  </div>
                  <Button asChild size="sm" className="mt-3 w-full"><Link href={`/billing/${invoice.id}`}>Open invoice and record payment</Link></Button>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-800">Front desk shortcuts</h4>
              <div className="mt-3 grid gap-2">
                <Button asChild variant="outline" className="justify-start"><Link href={`/appointments?view=calendar&date=${data.today}`}><CalendarDays className="mr-2 size-4" />View today&apos;s schedule</Link></Button>
                <Button asChild variant="outline" className="justify-start"><Link href="/patients"><UserRound className="mr-2 size-4" />Search patient records</Link></Button>
                <Button asChild variant="outline" className="justify-start"><Link href="/billing"><FileText className="mr-2 size-4" />Review invoices</Link></Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NurseDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getNurseDashboardData>> }) {
  return (
    <div className="space-y-5 bg-[#edf5f5] p-3 md:p-5">
      <RoleDashboardHeader userName={`Good morning, ${userName}`} roleLabelText="Nurse dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">My assigned visits</h3><div className="mt-3 space-y-2 text-sm text-slate-600">{data.queue.length === 0 ? <div className="rounded-xl bg-slate-50 p-3 text-slate-500">No assigned visits are available.</div> : data.queue.map(({ id, href, name, mrn, time, state }) => <Link key={id} href={href} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 sm:flex-row sm:items-center sm:justify-between"><span><span className="block font-medium text-slate-900">{name}</span><span className="text-xs text-slate-500">{mrn} · {time}</span></span><span className="text-sm">{state} <ArrowRight className="ml-1 inline size-3" /></span></Link>)}</div></Card>
    </div>
  );
}

function LabDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getLabDashboardData>> }) {
  return (
    <div className="space-y-5 bg-[#edf5f5] p-3 md:p-5">
      <RoleDashboardHeader userName={`Good morning, ${userName}`} roleLabelText="Lab dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Lab queue</h3><div className="mt-3 space-y-2 text-sm text-slate-600">{data.queue.map(({ label, value }) => <div key={label} className="flex justify-between rounded-xl bg-slate-50 p-3"><span>{label}</span><span>{value}</span></div>)}</div></Card>
    </div>
  );
}

function AccountantDashboard({ userName, data }: { userName: string; data: Awaited<ReturnType<typeof getAccountantDashboardData>> }) {
  return (
    <div className="space-y-5 bg-[#edf5f5] p-3 md:p-5">
      <RoleDashboardHeader userName={`Good morning, ${userName}`} roleLabelText="Accounting dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <Card className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Billing queue</h3><div className="mt-3 space-y-2 text-sm text-slate-600">{data.queue.map(({ label, value }) => <div key={label} className="flex justify-between rounded-xl bg-slate-50 p-3"><span>{label}</span><span>{value}</span></div>)}</div></Card>
    </div>
  );
}

export default async function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { role } = await params;
  const matchingRole = getRoleFromRoute(role);

  if (!matchingRole) {
    redirect(`/dashboard/${DASHBOARD_ROUTE_BY_ROLE[user.profile.role]}`);
  }

  if (matchingRole !== user.profile.role) {
    redirect(`/dashboard/${DASHBOARD_ROUTE_BY_ROLE[user.profile.role]}`);
  }

  switch (matchingRole) {
    case Role.DOCTOR: {
      const data = await getDoctorDashboardData(user);
      return <DoctorDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.ADMIN: {
      const data = await getAdminDashboardData();
      return <AdminDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.RECEPTIONIST: {
      const data = await getReceptionistDashboardData();
      return <ReceptionistDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.NURSE: {
      const data = await getNurseDashboardData(user);
      return <NurseDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.LAB_TECHNICIAN: {
      const data = await getLabDashboardData();
      return <LabDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.ACCOUNTANT: {
      const data = await getAccountantDashboardData();
      return <AccountantDashboard userName={user.profile.fullName} data={data} />;
    }
    case Role.SUPER_ADMIN: {
      const data = await getAdminDashboardData();
      return <AdminDashboard userName={user.profile.fullName} data={data} />;
    }
    default:
      redirect(`/dashboard/${DASHBOARD_ROUTE_BY_ROLE[user.profile.role]}`);
  }
}
