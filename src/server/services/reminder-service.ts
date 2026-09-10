import "server-only";
import { prisma } from "@/lib/db/prisma";

export type ReminderPayload = {
  to: string;
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
};

/** Provider-neutral email boundary. A real deployment swaps in a SendGrid/SES/Resend/etc.
 * implementation here — nothing else in the app needs to change. No paid integration is wired
 * up in this phase. */
export interface EmailReminderSender {
  send(payload: ReminderPayload): Promise<void>;
}

/** Fail closed until a delivery provider is configured. Never log reminder contents. */
class UnconfiguredEmailReminderSender implements EmailReminderSender {
  async send(): Promise<void> {
    throw new Error("Email reminder delivery is not configured.");
  }
}

export const emailReminderSender: EmailReminderSender = new UnconfiguredEmailReminderSender();

const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

function appointmentDateTime(date: Date, startTime: Date): Date {
  const combined = new Date(date);
  combined.setUTCHours(startTime.getUTCHours(), startTime.getUTCMinutes(), 0, 0);
  return combined;
}

/** Queues a reminder job ~24h before the visit. No-ops when the patient has no email on file,
 * since SMS/WhatsApp delivery is explicitly out of scope for this phase. */
export async function scheduleReminder(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { select: { email: true } } },
  });
  if (!appointment || !appointment.patient.email) return;

  const scheduledFor = new Date(
    appointmentDateTime(appointment.date, appointment.startTime).getTime() - REMINDER_LEAD_TIME_MS,
  );

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
