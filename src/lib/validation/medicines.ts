import { z } from "zod";

export const medicineSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(150),
  strength: z.string().trim().min(1, "Enter a strength, e.g. 500mg").max(50),
  form: z.string().trim().min(1, "Enter a form, e.g. Tablet").max(50),
});
export type MedicineInput = z.infer<typeof medicineSchema>;
