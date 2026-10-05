import { doctorScope } from "@/lib/permissions/record-scope";
import "server-only";
import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/policies";
import {
  addMinutesToTimeString,
  initialStatusForSource,
  isDuringLeave,
  isTerminalStatus,
  isValidTransition,
  isWithinAvailability,
  SLOT_BLOCKING_STATUSES,
  weekdayFromDateString,
} from "@/lib/appointments";
import { dateToTimeString, timeRangesOverlap, timeStringToDate } from "@/lib/scheduling";
import { recordAuditEvent } from "@/server/services/audit-service";
import { cancelReminder, scheduleReminder } from "@/server/services/reminder-service";
import type { CurrentUser } from "@/lib/auth/session";
import type {
  BookAppointmentInput,
  ChangeStatusInput,
  RescheduleAppointmentInput,
} from "@/lib/validation/appointments";

export class AppointmentConflictError extends Error {
  constructor() {
    super("This doctor already has an appointment that overlaps this time slot.");
    this.name = "AppointmentConflictError";
  }
}

export class AvailabilityWarningError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "AvailabilityWarningError";
  }
}

function isAppointmentOverlapConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as { code?: unknown; message?: unknown; meta?: unknown };
  if (databaseError.code !== "P2004") return false;
  const details = `${String(databaseError.message ?? "")} ${JSON.stringify(databaseError.meta ?? {})}`;
  return details.includes("appointments_no_doctor_overlap");
}

async function withAppointmentConflictMapping<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isAppointmentOverlapConstraintError(error)) throw new AppointmentConflictError();
    throw error;
  }
}

const appointmentInclude = {
  patient: { select: { id: true, patientId: true, firstName: true, lastName: true, phone: true } },
  doctor: { select: { id: true, fullName: true, slotDurationMinutes: true } },
} satisfies Prisma.AppointmentInclude;

async function assertPatientCanBook(patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!patient) throw new Error("Patient not found or archived.");
}

async function assertNoHardConflict(
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
) {
  const sameDay = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: new Date(date),
      status: { in: [...SLOT_BLOCKING_STATUSES] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  const conflict = sameDay.some((a) =>
    timeRangesOverlap(
      { startTime, endTime },
      { startTime: dateToTimeString(a.startTime), endTime: dateToTimeString(a.endTime) },
    ),
  );
  if (conflict) throw new AppointmentConflictError();
}

async function assertWithinAvailability(
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  const [availability, leaves] = await Promise.all([
    prisma.doctorAvailability.findMany({ where: { doctorId } }),
    prisma.doctorLeave.findMany({ where: { doctorId } }),
  ]);

  const leaveRanges = leaves.map((l) => ({
    startDate: l.startDate.toISOString().slice(0, 10),
    endDate: l.endDate.toISOString().slice(0, 10),
  }));
  if (isDuringLeave(date, leaveRanges)) {
    throw new AvailabilityWarningError("The doctor is on leave / blocked on this date.");
  }

  const blocks = availability.map((a) => ({
    weekday: a.weekday,
    startTime: dateToTimeString(a.startTime),
    endTime: dateToTimeString(a.endTime),
  }));
  const weekday = weekdayFromDateString(date);
  if (!isWithinAvailability(weekday, startTime, endTime, blocks)) {
    throw new AvailabilityWarningError("This time is outside the doctor's weekly availability.");
  }
}

async function assertWithinAvailabilityUnlessForced(
  actor: CurrentUser,
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
  force: boolean,
) {
  if (force) {
    assertCan(actor.profile.role, "appointments:override-availability");
    return;
  }
  await assertWithinAvailability(doctorId, date, startTime, endTime);
}

export type ListAppointmentsParams = {
  date?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
};

export async function listAppointments(actor: CurrentUser, params: ListAppointmentsParams) {
  assertCan(actor.profile.role, "appointments:view");

  const where: Prisma.AppointmentWhereInput = {
    ...doctorScope(actor),
    ...(params.date ? { date: new Date(params.date) } : {}),
    ...(params.doctorId ? { doctorId: params.doctorId } : {}),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 200;

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, total };
}

export async function getAppointmentById(actor: CurrentUser, id: string) {
  assertCan(actor.profile.role, "appointments:view");

  return prisma.appointment.findFirst({
    where: { id, ...doctorScope(actor) },
    include: {
      ...appointmentInclude,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { fullName: true, role: true } } },
      },
      reminder: true,
    },
  });
}

export async function bookAppointment(
  actor: CurrentUser,
  input: BookAppointmentInput,
  options: { force?: boolean } = {},
) {
  assertCan(actor.profile.role, "appointments:manage");
  await assertPatientCanBook(input.patientId);

  const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
  if (!doctor || doctor.status !== "ACTIVE") throw new Error("Doctor not found or archived.");

  const endTime = addMinutesToTimeString(input.startTime, doctor.slotDurationMinutes);

  await assertNoHardConflict(input.doctorId, input.date, input.startTime, endTime);
  await assertWithinAvailabilityUnlessForced(
    actor,
    input.doctorId,
    input.date,
    input.startTime,
    endTime,
    Boolean(options.force),
  );

  const status = initialStatusForSource(input.source);

  const appointment = await withAppointmentConflictMapping(() => prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        date: new Date(input.date),
        startTime: timeStringToDate(input.startTime),
        endTime: timeStringToDate(endTime),
        reason: input.reason,
        status,
        source: input.source,
      },
    });

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: created.id,
        fromStatus: null,
        toStatus: status,
        changedById: actor.profile.id,
      },
    });

    return created;
  }));

  if (status === "SCHEDULED") {
    await scheduleReminder(appointment.id);
  }

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "appointment.booked",
    entityType: "Appointment",
    entityId: appointment.id,
    metadata: { date: input.date, startTime: input.startTime, source: input.source },
  });

  return appointment;
}

export type RequestAppointmentInput = Omit<BookAppointmentInput, "patientId" | "source">;

/** The patient-portal counterpart to `bookAppointment`: no staff actor, always REQUESTED /
 * ONLINE_REQUEST, `patientId` taken only from the caller's own authenticated session (never a
 * client-supplied value) and never overridable — a portal patient can never book outside
 * availability. Shares the exact same hard-conflict check as staff booking. */
export async function requestAppointment(patientId: string, input: RequestAppointmentInput) {
  await assertPatientCanBook(patientId);
  const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
  if (!doctor || doctor.status !== "ACTIVE") throw new Error("Doctor not found or archived.");

  const endTime = addMinutesToTimeString(input.startTime, doctor.slotDurationMinutes);

  await assertNoHardConflict(input.doctorId, input.date, input.startTime, endTime);
  await assertWithinAvailability(input.doctorId, input.date, input.startTime, endTime);

    const appointment = await withAppointmentConflictMapping(() => prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId,
        doctorId: input.doctorId,
        date: new Date(input.date),
        startTime: timeStringToDate(input.startTime),
        endTime: timeStringToDate(endTime),
        reason: input.reason,
        status: "REQUESTED",
        source: "ONLINE_REQUEST",
      },
    });

    await tx.appointmentStatusHistory.create({
      data: { appointmentId: created.id, fromStatus: null, toStatus: "REQUESTED" },
    });

    return created;
  }));

  await recordAuditEvent({
    actorId: null,
    actorRole: null,
    action: "appointment.requested_by_patient",
    entityType: "Appointment",
    entityId: appointment.id,
    metadata: { date: input.date, startTime: input.startTime },
  });

  return appointment;
}

export async function rescheduleAppointment(
  actor: CurrentUser,
  id: string,
  input: RescheduleAppointmentInput,
  options: { force?: boolean } = {},
) {
  assertCan(actor.profile.role, "appointments:manage");

  const existing = await prisma.appointment.findUnique({ where: { id }, include: { doctor: true } });
  if (!existing) throw new Error("Appointment not found.");
  if (!(["REQUESTED", "SCHEDULED", "CONFIRMED"] as const).includes(existing.status as "REQUESTED" | "SCHEDULED" | "CONFIRMED")) {
    throw new Error("This appointment can no longer be rescheduled after the visit has started or closed.");
  }

  const endTime = addMinutesToTimeString(input.startTime, existing.doctor.slotDurationMinutes);

  await assertNoHardConflict(existing.doctorId, input.date, input.startTime, endTime, id);
  await assertWithinAvailabilityUnlessForced(
    actor,
    existing.doctorId,
    input.date,
    input.startTime,
    endTime,
    Boolean(options.force),
  );

  const oldDate = existing.date.toISOString().slice(0, 10);
  const oldStartTime = dateToTimeString(existing.startTime);

  const appointment = await withAppointmentConflictMapping(() =>
    prisma.appointment.update({
      where: { id },
      data: {
        date: new Date(input.date),
        startTime: timeStringToDate(input.startTime),
        endTime: timeStringToDate(endTime),
      },
    }),
  );

  if (existing.status === "SCHEDULED" || existing.status === "CONFIRMED") {
    await scheduleReminder(id);
  }

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "appointment.rescheduled",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      oldDate,
      oldStartTime,
      newDate: input.date,
      newStartTime: input.startTime,
      reason: input.reason,
    },
  });

  return appointment;
}

export async function changeAppointmentStatus(
  actor: CurrentUser,
  id: string,
  input: ChangeStatusInput,
) {
  assertCan(actor.profile.role, "appointments:manage-status");

  const existing = await prisma.appointment.findFirst({ where: { id, ...doctorScope(actor) } });
  if (!existing) throw new Error("Appointment not found.");
  if (existing.status !== input.fromStatus) {
    throw new Error("This appointment's status changed since you loaded it. Refresh and retry.");
  }
  if (!isValidTransition(existing.status, input.toStatus)) {
    throw new Error("That status change isn't allowed from the current status.");
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id, status: input.fromStatus },
      data: { status: input.toStatus },
    });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason || null,
        changedById: actor.profile.id,
      },
    });
    return updated;
  });

  if (input.toStatus === "CONFIRMED") {
    await scheduleReminder(id);
  } else if (input.toStatus === "CANCELLED" || input.toStatus === "NO_SHOW") {
    await cancelReminder(id);
  }

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "appointment.status_changed",
    entityType: "Appointment",
    entityId: id,
    metadata: { from: input.fromStatus, to: input.toStatus, reason: input.reason },
  });

  return appointment;
}
