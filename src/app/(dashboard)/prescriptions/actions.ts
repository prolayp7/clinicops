"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createPrescriptionSchema, prescriptionItemSchema } from "@/lib/validation/prescriptions";
import {
  addPrescriptionItem,
  createPrescription,
  issuePrescription,
  removePrescriptionItem,
} from "@/server/services/prescriptions-service";

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

export type FormState = { error: string | null; values?: Record<string, string> };

export async function createPrescriptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    patientId: String(formData.get("patientId") ?? ""),
    doctorId: String(formData.get("doctorId") ?? ""),
    consultationId: String(formData.get("consultationId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = createPrescriptionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  let prescriptionId: string;
  try {
    const prescription = await createPrescription(await requireActor(), parsed.data);
    prescriptionId = prescription.id;
  } catch (error) {
    return { error: publicError(error, "Could not create prescription."), values };
  }

  revalidatePath("/prescriptions");
  redirect(`/prescriptions/${prescriptionId}`);
}

export async function addItemAction(prescriptionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    medicineId: String(formData.get("medicineId") ?? ""),
    dosage: String(formData.get("dosage") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    route: String(formData.get("route") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    mealInstruction: String(formData.get("mealInstruction") ?? "NOT_APPLICABLE"),
    directions: String(formData.get("directions") ?? ""),
  };

  const parsed = prescriptionItemSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  try {
    await addPrescriptionItem(await requireActor(), prescriptionId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not add medicine."), values };
  }

  revalidatePath(`/prescriptions/${prescriptionId}`);
  return { error: null };
}

export async function removeItemAction(prescriptionId: string, itemId: string) {
  await removePrescriptionItem(await requireActor(), prescriptionId, itemId);
  revalidatePath(`/prescriptions/${prescriptionId}`);
}

export type IssueFormState = { error: string | null };

export async function issuePrescriptionAction(
  id: string,
  _prev: IssueFormState,
): Promise<IssueFormState> {
  try {
    await issuePrescription(await requireActor(), id);
  } catch (error) {
    return { error: publicError(error, "Could not issue prescription.") };
  }

  revalidatePath(`/prescriptions/${id}`);
  revalidatePath("/prescriptions");
  return { error: null };
}
