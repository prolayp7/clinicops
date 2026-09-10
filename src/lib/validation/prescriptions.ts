import { z } from "zod";
import { MealInstruction } from "@prisma/client";

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  doctorId: z.string().uuid("Select a doctor"),
  consultationId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const prescriptionItemSchema = z.object({
  medicineId: z.string().uuid("Select a medicine"),
  dosage: z.string().trim().min(1, "Enter a dosage, e.g. 1 tablet").max(100),
  frequency: z.string().trim().min(1, "Enter a frequency, e.g. Twice daily").max(100),
  route: z.string().trim().min(1, "Enter a route, e.g. Oral").max(50),
  duration: z.string().trim().min(1, "Enter a duration, e.g. 7 days").max(100),
  mealInstruction: z.nativeEnum(MealInstruction),
  directions: z.string().trim().max(500).optional().or(z.literal("")),
});
export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
