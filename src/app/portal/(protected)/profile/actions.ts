"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { updatePortalProfileSchema } from "@/lib/validation/portal";
import { updatePortalProfile } from "@/server/services/portal-service";

export type FormState = { error: string | null; success?: boolean };

export async function updatePortalProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = updatePortalProfileSchema.safeParse({
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode") || "",
    country: formData.get("country") || "",
    emergencyContactName: formData.get("emergencyContactName") || "",
    emergencyContactPhone: formData.get("emergencyContactPhone") || "",
    emergencyContactRelationship: formData.get("emergencyContactRelationship") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  try {
    await updatePortalProfile(patient, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update your profile.") };
  }

  revalidatePath("/portal/profile");
  return { error: null, success: true };
}
