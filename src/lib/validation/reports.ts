import { z } from "zod";

export const reportDateRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((v) => v.from <= v.to, { message: "The start date must be before the end date.", path: ["to"] });
export type ReportDateRangeInput = z.infer<typeof reportDateRangeSchema>;
