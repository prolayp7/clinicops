import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { timeStringToDate } from "@/lib/scheduling";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({
  doctor: { findUnique: vi.fn() },
  patient: { findFirst: vi.fn() },
    appointment: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  doctorAvailability: { findMany: vi.fn() },
  doctorLeave: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const tx = vi.hoisted(() => ({
  appointment: { create: vi.fn(), update: vi.fn() },
  appointmentStatusHistory: { create: vi.fn() },
}));
const reminderMocks = vi.hoisted(() => ({ scheduleReminder: vi.fn(), cancelReminder: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/services/audit-service", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/services/reminder-service", () => reminderMocks);

import {
  AppointmentConflictError,
  AvailabilityWarningError,
  bookAppointment,
  requestAppointment,
  rescheduleAppointment,
  changeAppointmentStatus,
} from "@/server/services/appointments-service";

const actor = { profile: { id: "receptionist-1", role: Role.RECEPTIONIST } } as CurrentUser;
const input = {
  patientId: "patient-1",
  doctorId: "doctor-1",
  date: "2026-10-05",
  startTime: "09:00",
  reason: "Follow-up",
  source: "STAFF_BOOKED" as const,
};
const overlapConstraintError = Object.assign(new Error("Database constraint failed"), {
  code: "P2004",
  meta: { database_error: 'violates exclusion constraint "appointments_no_doctor_overlap"' },
});

beforeEach(() => {
  vi.clearAllMocks();
  db.doctor.findUnique.mockResolvedValue({ id: "doctor-1", status: "ACTIVE", slotDurationMinutes: 30 });
  db.patient.findFirst.mockResolvedValue({ id: "patient-1" });
  db.appointment.findMany.mockResolvedValue([]);
  db.appointment.findFirst.mockResolvedValue({ id: "appointment-1", status: "SCHEDULED" });
  db.doctorAvailability.findMany.mockResolvedValue([
    { weekday: "MONDAY", startTime: timeStringToDate("09:00"), endTime: timeStringToDate("12:00") },
  ]);
  db.doctorLeave.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation((callback: unknown) => {
    if (typeof callback !== "function") return Promise.resolve(undefined);
    return (callback as (client: typeof tx) => Promise<unknown>)(tx);
  });
  tx.appointment.create.mockResolvedValue({ id: "appointment-created" });
  tx.appointment.update.mockResolvedValue({ id: "appointment-1", status: "CONFIRMED" });
  tx.appointmentStatusHistory.create.mockResolvedValue({ id: "status-history-1" });
});

describe("appointment booking workflows", () => {
  it("books a staff appointment, records initial status history, and queues a reminder", async () => {
    await expect(bookAppointment(actor, input)).resolves.toMatchObject({ id: "appointment-created" });

    expect(tx.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: "patient-1",
        doctorId: "doctor-1",
        status: "SCHEDULED",
        source: "STAFF_BOOKED",
      }),
    });
    expect(tx.appointmentStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ appointmentId: "appointment-created", toStatus: "SCHEDULED" }),
    });
    expect(reminderMocks.scheduleReminder).toHaveBeenCalledWith("appointment-created");
  });

  it("creates online requests as REQUESTED without scheduling a confirmed-visit reminder", async () => {
    await expect(requestAppointment("patient-1", {
      doctorId: "doctor-1",
      date: "2026-10-05",
      startTime: "09:00",
      reason: "Follow-up",
    })).resolves.toMatchObject({ id: "appointment-created" });

    expect(tx.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ patientId: "patient-1", status: "REQUESTED", source: "ONLINE_REQUEST" }),
    });
    expect(reminderMocks.scheduleReminder).not.toHaveBeenCalled();
  });
  it("maps a concurrent portal request conflict to the normal appointment conflict", async () => {
    db.$transaction.mockRejectedValue(overlapConstraintError);

    await expect(requestAppointment("patient-1", {
      doctorId: "doctor-1",
      date: "2026-10-05",
      startTime: "09:00",
      reason: "Follow-up",
    })).rejects.toBeInstanceOf(AppointmentConflictError);
  });
  
  describe("appointment status and reminder synchronization", () => {
    it("schedules a reminder when a requested appointment is confirmed", async () => {
      await changeAppointmentStatus(actor, "appointment-1", {
        fromStatus: "SCHEDULED",
        toStatus: "CONFIRMED",
        reason: "",
      });

      expect(reminderMocks.scheduleReminder).toHaveBeenCalledWith("appointment-1");
      expect(tx.appointmentStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ fromStatus: "SCHEDULED", toStatus: "CONFIRMED" }),
      });
    });

    it("cancels a pending reminder when an appointment is cancelled", async () => {
      tx.appointment.update.mockResolvedValue({ id: "appointment-1", status: "CANCELLED" });

      await changeAppointmentStatus(actor, "appointment-1", {
        fromStatus: "SCHEDULED",
        toStatus: "CANCELLED",
        reason: "Patient called to cancel",
      });

      expect(reminderMocks.cancelReminder).toHaveBeenCalledWith("appointment-1");
    });
  });

  it("warns outside normal availability and permits only an authorized override", async () => {
    db.doctorAvailability.findMany.mockResolvedValue([]);
    await expect(bookAppointment(actor, input)).rejects.toBeInstanceOf(AvailabilityWarningError);
    expect(db.$transaction).not.toHaveBeenCalled();

    await expect(bookAppointment(actor, input, { force: true })).resolves.toMatchObject({ id: "appointment-created" });
    expect(db.doctorAvailability.findMany).toHaveBeenCalledOnce();
  });

  it("rejects booking for archived or missing patients before creating an appointment", async () => {
    db.patient.findFirst.mockResolvedValue(null);

    await expect(bookAppointment(actor, input)).rejects.toThrow("Patient not found or archived");
    expect(db.doctor.findUnique).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects rescheduling after check-in has started", async () => {
    db.appointment.findUnique.mockResolvedValue({
      id: "appointment-1",
      doctorId: "doctor-1",
      status: "CHECKED_IN",
      doctor: { slotDurationMinutes: 30 },
    });

    await expect(rescheduleAppointment(actor, "appointment-1", {
      date: "2026-10-05",
      startTime: "10:00",
      reason: "Schedule change",
    })).rejects.toThrow("after the visit has started");
    expect(db.appointment.update).not.toHaveBeenCalled();
  });
});

describe("appointment overlap constraint mapping", () => {
  it("returns the normal conflict error when a concurrent booking wins the database constraint", async () => {
    db.$transaction.mockRejectedValue(overlapConstraintError);

    await expect(bookAppointment(actor, input)).rejects.toBeInstanceOf(AppointmentConflictError);
  });

  it("maps the same constraint when a concurrent reschedule wins", async () => {
    db.appointment.findUnique.mockResolvedValue({
      id: "appointment-1",
      doctorId: "doctor-1",
      date: new Date("2026-10-05T00:00:00.000Z"),
      startTime: timeStringToDate("09:00"),
      status: "SCHEDULED",
      doctor: { slotDurationMinutes: 30 },
    });
    db.appointment.update.mockRejectedValue(overlapConstraintError);

    await expect(
      rescheduleAppointment(actor, "appointment-1", {
        date: "2026-10-05",
        startTime: "10:00",
        reason: "Schedule change",
      }),
    ).rejects.toBeInstanceOf(AppointmentConflictError);
  });

  it("does not hide unrelated database constraint failures as scheduling conflicts", async () => {
    const unrelated = Object.assign(new Error("Other constraint failed"), {
      code: "P2004",
      meta: { database_error: "some_other_constraint" },
    });
    db.$transaction.mockRejectedValue(unrelated);

    await expect(bookAppointment(actor, input)).rejects.toBe(unrelated);
  });
});