"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  amendConsultationFormSchema,
  completeConsultationFormSchema,
  saveDraftSchema,
} from "@/lib/validation/consultations";
import {
  addAttachment,
  amendConsultation,
  completeConsultation,
  saveDraft,
  startOrResumeConsultation,
} from "@/server/services/consultations-service";

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

const CONSULTATION_FIELD_NAMES = [
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "pulseBpm",
  "temperatureCelsius",
  "respiratoryRate",
  "oxygenSaturationPercent",
  "heightCm",
  "weightKg",
  "symptoms",
  "diagnosis",
  "clinicalNotes",
  "treatmentPlan",
  "followUpDate",
] as const;

function captureValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of CONSULTATION_FIELD_NAMES) values[name] = String(formData.get(name) ?? "");
  return values;
}

export type FormState = {
  error: string | null;
  success?: boolean;
  values?: Record<string, string>;
};

export async function startConsultationAction(appointmentId: string) {
  const consultation = await startOrResumeConsultation(await requireActor(), appointmentId);
  revalidatePath("/consultations");
  revalidatePath("/appointments");
  redirect(`/consultations/${consultation.id}`);
}

export async function saveDraftAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = captureValues(formData);
  const parsed = saveDraftSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  try {
    await saveDraft(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not save draft."), values };
  }

  revalidatePath(`/consultations/${id}`);
  return { error: null, success: true };
}

export async function completeConsultationAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = captureValues(formData);
  const parsed = completeConsultationFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  try {
    await completeConsultation(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not complete consultation."), values };
  }

  revalidatePath(`/consultations/${id}`);
  revalidatePath("/consultations");
  revalidatePath("/appointments");
  return { error: null, success: true };
}

export async function amendConsultationAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = captureValues(formData);
  const reason = String(formData.get("reason") ?? "");
  const parsed = amendConsultationFormSchema.safeParse({ ...values, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  try {
    await amendConsultation(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not save amendment."), values };
  }

  revalidatePath(`/consultations/${id}`);
  return { error: null, success: true };
}

export type AttachmentFormState = { error: string | null };

export async function addAttachmentAction(
  id: string,
  _prev: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to attach." };
  }

  try {
    await addAttachment(await requireActor(), id, file);
  } catch (error) {
    return { error: publicError(error, "Could not upload attachment.") };
  }

  revalidatePath(`/consultations/${id}`);
  return { error: null };
}
