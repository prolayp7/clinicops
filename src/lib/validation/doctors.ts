import { Weekday } from "@prisma/client";
import { z } from "zod";

export const nameOnlySchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(100),
});
export type NameOnlyInput = z.infer<typeof nameOnlySchema>;

export const clinicSettingSchema = z.object({
  name: z.string().trim().min(2).max(150),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email(),
  timezone: z.string().trim().min(1),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter ISO currency code, e.g. USD")
    .toUpperCase(),
});
export type ClinicSettingInput = z.infer<typeof clinicSettingSchema>;

export const doctorSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30),
  licenseNumber: z.string().trim().min(2).max(50),
  departmentId: z.string().uuid("Select a department"),
  specializationId: z.string().uuid("Select a specialization"),
  qualifications: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "Add at least one qualification"),
  consultationFeeCents: z.coerce.number().int().min(0).max(100_000_00),
  slotDurationMinutes: z.coerce.number().int().min(5).max(240),
});
export type DoctorInput = z.infer<typeof doctorSchema>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeString = z.string().regex(TIME_RE, "Use 24-hour HH:mm, e.g. 09:00");

export const availabilitySchema = z
  .object({
    weekday: z.nativeEnum(Weekday),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

export const leaveSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "Start date must be on or before the end date",
    path: ["endDate"],
  });
export type LeaveInput = z.infer<typeof leaveSchema>;
