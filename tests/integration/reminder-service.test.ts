import { beforeEach, describe, expect, it, vi } from "vitest";
import { timeStringToDate } from "@/lib/scheduling";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  appointment: { findUnique: vi.fn() },
  appointmentReminder: { upsert: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/services/clinic-settings-service", () => ({
  getClinicSettings: vi.fn().mockResolvedValue({ timezone: "UTC" }),
}));

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mailer", () => ({ sendMail }));

import { cancelReminder, emailReminderSender, processDueReminders, scheduleReminder } from "@/server/services/reminder-service";

const appointment = {
  id: "appointment-1",
  date: new Date("2026-10-05T00:00:00.000Z"),
  startTime: timeStringToDate("09:00"),
  patient: { email: "synthetic.patient@example.test", firstName: "Test", lastName: "Patient" },
  doctor: { fullName: "Dr. Example" },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.appointment.findUnique.mockResolvedValue(appointment);
  db.appointmentReminder.findMany.mockResolvedValue([]);
  sendMail.mockResolvedValue(undefined);
});

describe("appointment reminder scheduling", () => {
  it("queues one reminder 24 hours before an appointment", async () => {
    await scheduleReminder("appointment-1");

    expect(db.appointmentReminder.upsert).toHaveBeenCalledWith({
      where: { appointmentId: "appointment-1" },
      create: { appointmentId: "appointment-1", scheduledFor: new Date("2026-10-04T09:00:00.000Z") },
      update: { scheduledFor: new Date("2026-10-04T09:00:00.000Z"), status: "PENDING", sentAt: null },
    });
  });

  it("does not queue email reminders when no patient email exists", async () => {
    db.appointment.findUnique.mockResolvedValue({ ...appointment, patient: { email: null } });

    await scheduleReminder("appointment-1");

    expect(db.appointmentReminder.upsert).not.toHaveBeenCalled();
  });

  it("cancels only pending reminder jobs", async () => {
    await cancelReminder("appointment-1");

    expect(db.appointmentReminder.updateMany).toHaveBeenCalledWith({
      where: { appointmentId: "appointment-1", status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  });
});

describe("appointment reminder delivery", () => {
  it("sends the appointment reminder through the SMTP mail boundary", async () => {
    await emailReminderSender.send({
      to: appointment.patient.email,
      patientName: "Test Patient",
      doctorName: "Dr. Example",
      date: "2026-10-05",
      startTime: "09:00",
    });

    expect(sendMail).toHaveBeenCalledWith({
      to: "synthetic.patient@example.test",
      subject: "Appointment reminder",
      text: expect.stringContaining("Dr. Example on 2026-10-05 at 09:00"),
    });
  });

  it("marks delivered jobs SENT and SMTP failures FAILED", async () => {
    db.appointmentReminder.findMany.mockResolvedValue([
      { id: "reminder-1", appointment },
    ]);

    await expect(processDueReminders(new Date("2026-10-05T10:00:00.000Z"))).resolves.toBe(1);
    expect(db.appointmentReminder.update).toHaveBeenCalledWith({
      where: { id: "reminder-1" },
      data: { status: "SENT", sentAt: expect.any(Date) },
    });

    vi.clearAllMocks();
    db.appointmentReminder.findMany.mockResolvedValue([{ id: "reminder-2", appointment }]);
    sendMail.mockRejectedValue(new Error("SMTP unavailable"));
    await expect(processDueReminders(new Date("2026-10-05T10:00:00.000Z"))).resolves.toBe(1);
    expect(db.appointmentReminder.update).toHaveBeenCalledWith({
      where: { id: "reminder-2" },
      data: { status: "FAILED" },
    });
  });
});