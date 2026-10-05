import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { clinicDateTimeToUtc, dateToTimeString } from "@/lib/scheduling";
import { sendMail } from "@/lib/mailer";
import { getClinicSettings } from "@/server/services/clinic-settings-service";

export type ReminderPayload = {
  to: string;
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
};

/** Provider-neutral email boundary. The current implementation uses the configured SMTP transport. */
export interface EmailReminderSender {
  send(payload: ReminderPayload): Promise<void>;
}

export const emailReminderSender: EmailReminderSender = {
  async send(payload) {
    await sendMail({
      to: payload.to,
      subject: "Appointment reminder",
      text: `Hello ${payload.patientName},\n\nThis is a reminder of your appointment with ${payload.doctorName} on ${payload.date} at ${payload.startTime}.\n\nPlease contact the clinic if you need to reschedule.`,
    });
  },
};

const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

/** Queues a reminder job ~24h before the visit. No-ops when the patient has no email on file,
 * since SMS/WhatsApp delivery is explicitly out of scope for this phase. */
export async function scheduleReminder(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { select: { email: true } } },
  });
  if (!appointment || !appointment.patient.email) return;

  const clinicSettings = await getClinicSettings();
  const timeZone = clinicSettings?.timezone ?? getEnv().CLINIC_TIMEZONE;
  const appointmentAt = clinicDateTimeToUtc(
    appointment.date.toISOString().slice(0, 10),
    dateToTimeString(appointment.startTime),
    timeZone,
  );
  const scheduledFor = new Date(appointmentAt.getTime() - REMINDER_LEAD_TIME_MS);

  await prisma.appointmentReminder.upsert({
    where: { appointmentId },
    create: { appointmentId, scheduledFor },
    update: { scheduledFor, status: "PENDING", sentAt: null },
  });
}

/** Cancels a pending reminder job — called when its appointment is cancelled or marked no-show. */
export async function cancelReminder(appointmentId: string) {
  await prisma.appointmentReminder.updateMany({
    where: { appointmentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

/** Sends every due, pending reminder. Nothing in this phase calls this on a timer — a future
 * deployment would wire a scheduled task (e.g. a Vercel Cron route) to invoke it periodically. */
export async function processDueReminders(now: Date = new Date()) {
  const due = await prisma.appointmentReminder.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    include: {
      appointment: {
        include: { patient: true, doctor: true },
      },
    },
  });

  for (const reminder of due) {
    const { appointment } = reminder;
    if (!appointment.patient.email) {
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    try {
      await emailReminderSender.send({
        to: appointment.patient.email,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        doctorName: appointment.doctor.fullName,
        date: appointment.date.toISOString().slice(0, 10),
        startTime: appointment.startTime.toISOString().slice(11, 16),
      });
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch {
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: { status: "FAILED" },
      });
    }
  }

  return due.length;
}
