"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  clinicSettingSchema,
  nameOnlySchema,
  type ClinicSettingInput,
} from "@/lib/validation/doctors";
import { medicineSchema } from "@/lib/validation/medicines";
import { labTestSchema } from "@/lib/validation/lab-tests";
import {
  createDepartment,
  setDepartmentStatus,
  updateDepartment,
} from "@/server/services/departments-service";
import {
  createSpecialization,
  setSpecializationStatus,
  updateSpecialization,
} from "@/server/services/specializations-service";
import {
  createMedicine,
  setMedicineStatus,
  updateMedicine,
} from "@/server/services/medicines-service";
import {
  createLabTest,
  setLabTestStatus,
  updateLabTest,
} from "@/server/services/lab-tests-service";
import {
  createDocumentCategory,
  setDocumentCategoryStatus,
  updateDocumentCategory,
} from "@/server/services/document-categories-service";
import { upsertClinicSettings } from "@/server/services/clinic-settings-service";

export type FormState = { error: string | null };

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

function parseNameOnly(formData: FormData): FormState & { name?: string } {
  const parsed = nameOnlySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  return { error: null, name: parsed.data.name };
}

export async function createDepartmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await createDepartment(await requireActor(), { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not create department.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function updateDepartmentAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await updateDepartment(await requireActor(), id, { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not update department.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function toggleDepartmentStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setDepartmentStatus(await requireActor(), id, nextStatus);
  revalidatePath("/settings");
}

export async function createSpecializationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await createSpecialization(await requireActor(), { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not create specialization.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function updateSpecializationAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await updateSpecialization(await requireActor(), id, { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not update specialization.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function toggleSpecializationStatusAction(
  id: string,
  nextStatus: "ACTIVE" | "ARCHIVED",
) {
  await setSpecializationStatus(await requireActor(), id, nextStatus);
  revalidatePath("/settings");
}

function parseMedicine(formData: FormData) {
  return medicineSchema.safeParse({
    name: formData.get("name"),
    strength: formData.get("strength"),
    form: formData.get("form"),
  });
}

export async function createMedicineAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseMedicine(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  try {
    await createMedicine(await requireActor(), parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not create medicine.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function updateMedicineAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseMedicine(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  try {
    await updateMedicine(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update medicine.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function toggleMedicineStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setMedicineStatus(await requireActor(), id, nextStatus);
  revalidatePath("/settings");
}

function parseLabTest(formData: FormData) {
  const dollars = Number(formData.get("priceDollars"));
  return labTestSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    // Monetary values are stored as integer cents; the form collects dollars for readability.
    priceCents: Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN,
    unit: formData.get("unit"),
    referenceRangeText: formData.get("referenceRangeText"),
  });
}

export async function createLabTestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseLabTest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  try {
    await createLabTest(await requireActor(), parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not create lab test.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function updateLabTestAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseLabTest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  try {
    await updateLabTest(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update lab test.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function toggleLabTestStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setLabTestStatus(await requireActor(), id, nextStatus);
  revalidatePath("/settings");
}

export async function createDocumentCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await createDocumentCategory(await requireActor(), { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not create category.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function updateDocumentCategoryAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameOnly(formData);
  if (parsed.error) return parsed;
  try {
    await updateDocumentCategory(await requireActor(), id, { name: parsed.name! });
  } catch (error) {
    return { error: publicError(error, "Could not update category.") };
  }
  revalidatePath("/settings");
  return { error: null };
}

export async function toggleDocumentCategoryStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setDocumentCategoryStatus(await requireActor(), id, nextStatus);
  revalidatePath("/settings");
}

export async function saveClinicSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw: ClinicSettingInput = {
    name: String(formData.get("name") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    addressLine2: String(formData.get("addressLine2") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    country: String(formData.get("country") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    currency: String(formData.get("currency") ?? ""),
  };

  const parsed = clinicSettingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await upsertClinicSettings(await requireActor(), parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not save clinic settings.") };
  }
  revalidatePath("/settings");
  return { error: null };
}
