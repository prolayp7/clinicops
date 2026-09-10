import { AppointmentSource, AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { isReasonRequired, isValidTransition } from "@/lib/appointments";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeString = z.string().regex(TIME_RE, "Use 24-hour HH:mm, e.g. 09:00");

export const bookAppointmentSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  doctorId: z.string().uuid("Select a doctor"),
  date: z.string().date(),
  startTime: timeString,
  reason: z.string().trim().min(1, "Enter a reason for the visit").max(300),
  source: z.nativeEnum(AppointmentSource),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  date: z.string().date(),
  startTime: timeString,
  reason: z.string().trim().min(1, "Enter a reason for rescheduling").max(300),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const changeStatusSchema = z
  .object({
    fromStatus: z.nativeEnum(AppointmentStatus),
    toStatus: z.nativeEnum(AppointmentStatus),
    reason: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((v) => isValidTransition(v.fromStatus, v.toStatus), {
    message: "That status change isn't allowed from the current status.",
    path: ["toStatus"],
  })
  .refine((v) => !isReasonRequired(v.toStatus) || Boolean(v.reason), {
    message: "A reason is required for cancellations and no-shows.",
    path: ["reason"],
  });
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
