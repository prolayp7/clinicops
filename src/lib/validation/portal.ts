import { z } from "zod";

export const requestAppointmentSchema = z.object({
  doctorId: z.string().uuid("Select a doctor"),
  date: z.string().date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use 24-hour HH:mm, e.g. 09:00"),
  reason: z.string().trim().min(1, "Enter a reason for the visit").max(300),
});
export type RequestAppointmentFormInput = z.infer<typeof requestAppointmentSchema>;

/** Deliberately narrower than the staff-side patient schema: only non-clinical contact fields.
 * Name, DOB, sex and every clinical field (allergies, history, medications, diagnoses) require a
 * staff-verified change and are excluded on purpose. */
export const updatePortalProfileSchema = z.object({
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(150).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  emergencyContactRelationship: z.string().trim().max(50).optional().or(z.literal("")),
});
export type UpdatePortalProfileInput = z.infer<typeof updatePortalProfileSchema>;

export const enablePortalAccessSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
export type EnablePortalAccessInput = z.infer<typeof enablePortalAccessSchema>;
