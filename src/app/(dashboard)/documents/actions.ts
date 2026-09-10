"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadDocumentSchema } from "@/lib/validation/documents";
import { setDocumentStatus, uploadPatientDocument } from "@/server/services/documents-service";

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

export type UploadFormState = { error: string | null };

export async function uploadDocumentAction(
  patientId: string,
  _prev: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const parsed = uploadDocumentSchema.safeParse({
    categoryId: formData.get("categoryId"),
    consultationId: formData.get("consultationId") ?? "",
    labOrderId: formData.get("labOrderId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await uploadPatientDocument(await requireActor(), patientId, parsed.data, file);
  } catch (error) {
    return { error: publicError(error, "Could not upload document.") };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/documents");
  return { error: null };
}

export async function toggleDocumentStatusAction(
  documentId: string,
  patientId: string,
  nextStatus: "ACTIVE" | "ARCHIVED",
) {
  await setDocumentStatus(await requireActor(), documentId, nextStatus);
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/documents");
}
