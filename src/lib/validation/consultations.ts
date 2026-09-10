import { z } from "zod";

/** A numeric vitals field submitted from a text/number input: blank string means "not recorded". */
function optionalInt(min: number, max: number) {
  return z
    .union([z.literal(""), z.coerce.number().int().min(min).max(max)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
}
function optionalFloat(min: number, max: number) {
  return z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
}
const optionalText = z
  .string()
  .trim()
  .max(4000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const optionalDate = z
  .union([z.literal(""), z.string().date()])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const vitalsSchema = z.object({
  bloodPressureSystolic: optionalInt(40, 300),
  bloodPressureDiastolic: optionalInt(20, 200),
  pulseBpm: optionalInt(20, 250),
  temperatureCelsius: optionalFloat(25, 45),
  respiratoryRate: optionalInt(5, 60),
  oxygenSaturationPercent: optionalInt(0, 100),
  heightCm: optionalFloat(20, 250),
  weightKg: optionalFloat(1, 400),
});
export type VitalsInput = z.infer<typeof vitalsSchema>;

export const clinicalDraftSchema = z.object({
  symptoms: optionalText,
  diagnosis: optionalText,
  clinicalNotes: optionalText,
  treatmentPlan: optionalText,
  followUpDate: optionalDate,
});
export type ClinicalDraftInput = z.infer<typeof clinicalDraftSchema>;

export const completeConsultationSchema = clinicalDraftSchema.extend({
  diagnosis: z.string().trim().min(1, "Enter a diagnosis before completing the consultation."),
  clinicalNotes: z
    .string()
    .trim()
    .min(1, "Enter clinical notes before completing the consultation."),
});
export type CompleteConsultationInput = z.infer<typeof completeConsultationSchema>;

export const amendConsultationSchema = clinicalDraftSchema.extend({
  reason: z.string().trim().min(5, "Explain the reason for this amendment."),
});
export type AmendConsultationInput = z.infer<typeof amendConsultationSchema>;

export const saveDraftSchema = vitalsSchema.merge(clinicalDraftSchema);
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

export const completeConsultationFormSchema = vitalsSchema.merge(completeConsultationSchema);
export type CompleteConsultationFormInput = z.infer<typeof completeConsultationFormSchema>;

export const amendConsultationFormSchema = vitalsSchema.merge(amendConsultationSchema);
export type AmendConsultationFormInput = z.infer<typeof amendConsultationFormSchema>;
