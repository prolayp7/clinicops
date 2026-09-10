import { z } from "zod";

export const labTestSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(150),
  category: z.string().trim().min(2, "Enter a category, e.g. Hematology").max(100),
  priceCents: z.coerce.number().int().min(0).max(100_000_00),
  unit: z.string().trim().min(1, "Enter a unit, e.g. mg/dL").max(50),
  referenceRangeText: z.string().trim().min(1, "Enter a reference range, e.g. 70-100 mg/dL").max(200),
});
export type LabTestInput = z.infer<typeof labTestSchema>;
