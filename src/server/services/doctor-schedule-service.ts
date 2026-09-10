import "server-only";
import { Role, type Doctor } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCan, ForbiddenError } from "@/lib/permissions/policies";
import { dateRangesOverlap, dateToTimeString, timeRangesOverlap, timeStringToDate } from "@/lib/scheduling";
import { recordAuditEvent } from "@/server/services/audit-service";
import type { CurrentUser } from "@/lib/auth/session";
import type { AvailabilityInput, LeaveInput } from "@/lib/validation/doctors";

/** A doctor may manage only their own schedule; admins may manage any doctor's. */
function assertCanManageSchedule(actor: CurrentUser, doctor: Pick<Doctor, "staffProfileId">) {
  assertCan(actor.profile.role, "doctors:manage-availability");
  if (actor.profile.role === Role.DOCTOR && doctor.staffProfileId !== actor.profile.id) {
    throw new ForbiddenError("doctors:manage-availability");
  }
}

async function requireDoctor(doctorId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new Error("Doctor not found.");
  return doctor;
}

export async function addAvailabilitySlot(
  actor: CurrentUser,
  doctorId: string,
  input: AvailabilityInput,
) {
  const doctor = await requireDoctor(doctorId);
  assertCanManageSchedule(actor, doctor);

  const existing = await prisma.doctorAvailability.findMany({
    where: { doctorId, weekday: input.weekday },
  });
  const conflict = existing.some((slot) =>
    timeRangesOverlap(
      { startTime: input.startTime, endTime: input.endTime },
      { startTime: dateToTimeString(slot.startTime), endTime: dateToTimeString(slot.endTime) },
    ),
  );
  if (conflict) {
    throw new Error("This overlaps an existing availability block on that day.");
  }

  const slot = await prisma.doctorAvailability.create({
    data: {
      doctorId,
      weekday: input.weekday,
      startTime: timeStringToDate(input.startTime),
      endTime: timeStringToDate(input.endTime),
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor_availability.added",
    entityType: "Doctor",
    entityId: doctorId,
    metadata: { weekday: input.weekday, startTime: input.startTime, endTime: input.endTime },
  });

  return slot;
}

export async function removeAvailabilitySlot(actor: CurrentUser, doctorId: string, slotId: string) {
  const doctor = await requireDoctor(doctorId);
  assertCanManageSchedule(actor, doctor);

  await prisma.doctorAvailability.delete({ where: { id: slotId } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor_availability.removed",
    entityType: "Doctor",
    entityId: doctorId,
    metadata: { slotId },
  });
}

export async function addLeave(actor: CurrentUser, doctorId: string, input: LeaveInput) {
  const doctor = await requireDoctor(doctorId);
  assertCanManageSchedule(actor, doctor);

  const existing = await prisma.doctorLeave.findMany({ where: { doctorId } });
  const conflict = existing.some((leave) =>
    dateRangesOverlap(
      { startDate: input.startDate, endDate: input.endDate },
      {
        startDate: leave.startDate.toISOString().slice(0, 10),
        endDate: leave.endDate.toISOString().slice(0, 10),
      },
    ),
  );
  if (conflict) {
    throw new Error("This overlaps an existing leave/blocked date range.");
  }

  const leave = await prisma.doctorLeave.create({
    data: {
      doctorId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      reason: input.reason || null,
    },
  });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor_leave.added",
    entityType: "Doctor",
    entityId: doctorId,
    metadata: { startDate: input.startDate, endDate: input.endDate },
  });

  return leave;
}

export async function removeLeave(actor: CurrentUser, doctorId: string, leaveId: string) {
  const doctor = await requireDoctor(doctorId);
  assertCanManageSchedule(actor, doctor);

  await prisma.doctorLeave.delete({ where: { id: leaveId } });

  await recordAuditEvent({
    actorId: actor.profile.id,
    actorRole: actor.profile.role,
    action: "doctor_leave.removed",
    entityType: "Doctor",
    entityId: doctorId,
    metadata: { leaveId },
  });
}
