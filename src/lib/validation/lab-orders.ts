import { z } from "zod";
import { AbnormalFlag, LabOrderStatus } from "@prisma/client";
import { isReasonRequired, isValidTransition } from "@/lib/laboratory";

export const createLabOrderSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  consultationId: z.string().uuid().optional().or(z.literal("")),
  testIds: z.array(z.string().uuid()).min(1, "Select at least one test"),
});
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;

export const changeLabOrderStatusSchema = z
  .object({
    fromStatus: z.nativeEnum(LabOrderStatus),
    toStatus: z.nativeEnum(LabOrderStatus),
    reason: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((v) => isValidTransition(v.fromStatus, v.toStatus), {
    message: "That status change isn't allowed from the current status.",
    path: ["toStatus"],
  })
  .refine((v) => !isReasonRequired(v.toStatus) || Boolean(v.reason), {
    message: "A reason is required to cancel an order.",
    path: ["reason"],
  });
export type ChangeLabOrderStatusInput = z.infer<typeof changeLabOrderStatusSchema>;

export const labResultItemSchema = z.object({
  itemId: z.string().uuid(),
  resultValue: z.string().trim().max(200).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(50),
  referenceRange: z.string().trim().min(1).max(200),
  abnormalFlag: z.nativeEnum(AbnormalFlag),
});
export type LabResultItemInput = z.infer<typeof labResultItemSchema>;

export const saveResultsSchema = z.object({
  items: z.array(labResultItemSchema).min(1),
});
export type SaveResultsInput = z.infer<typeof saveResultsSchema>;
