import { z } from "zod";

export const uploadDocumentSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  consultationId: z.string().uuid().optional().or(z.literal("")),
  labOrderId: z.string().uuid().optional().or(z.literal("")),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
