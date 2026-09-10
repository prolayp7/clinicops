"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { availabilitySchema, doctorSchema, leaveSchema } from "@/lib/validation/doctors";
import {
  createDoctor,
  setDoctorStatus,
  updateDoctor,
  uploadDoctorSignatureImage,
} from "@/server/services/doctors-service";
import {
  addAvailabilitySlot,
  addLeave,
  removeAvailabilitySlot,
  removeLeave,
} from "@/server/services/doctor-schedule-service";

export type FormState = { error: string | null };

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

function parseDoctorForm(formData: FormData) {
  const dollars = Number(formData.get("consultationFeeDollars"));

  return doctorSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    licenseNumber: formData.get("licenseNumber"),
    departmentId: formData.get("departmentId"),
    specializationId: formData.get("specializationId"),
    qualifications: String(formData.get("qualifications") ?? "")
      .split(",")
      .map((q) => q.trim())
      .filter(Boolean),
    // Monetary values are stored as integer cents; the form collects dollars for readability.
    consultationFeeCents: Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN,
    slotDurationMinutes: formData.get("slotDurationMinutes"),
  });
}

export async function createDoctorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseDoctorForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  const staffProfileId = String(formData.get("staffProfileId") ?? "");
  if (!staffProfileId) return { error: "Select a staff account for this doctor." };

  let doctorId: string;
  try {
    const doctor = await createDoctor(await requireActor(), { ...parsed.data, staffProfileId });
    doctorId = doctor.id;
  } catch (error) {
    return { error: publicError(error, "Could not create doctor.") };
  }

  revalidatePath("/doctors");
  redirect(`/doctors/${doctorId}`);
}

export async function updateDoctorAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseDoctorForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await updateDoctor(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update doctor.") };
  }

  revalidatePath("/doctors");
  revalidatePath(`/doctors/${id}`);
  redirect(`/doctors/${id}`);
}

export async function toggleDoctorStatusAction(id: string, nextStatus: "ACTIVE" | "ARCHIVED") {
  await setDoctorStatus(await requireActor(), id, nextStatus);
  revalidatePath("/doctors");
  revalidatePath(`/doctors/${id}`);
}

export async function addAvailabilityAction(
  doctorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = availabilitySchema.safeParse({
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the availability fields." };
  }

  try {
    await addAvailabilitySlot(await requireActor(), doctorId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not add availability.") };
  }

  revalidatePath(`/doctors/${doctorId}`);
  return { error: null };
}

export async function removeAvailabilityAction(doctorId: string, slotId: string) {
  await removeAvailabilitySlot(await requireActor(), doctorId, slotId);
  revalidatePath(`/doctors/${doctorId}`);
}

export async function addLeaveAction(
  doctorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = leaveSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the leave dates." };
  }

  try {
    await addLeave(await requireActor(), doctorId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not add leave.") };
  }

  revalidatePath(`/doctors/${doctorId}`);
  return { error: null };
}

export async function removeLeaveAction(doctorId: string, leaveId: string) {
  await removeLeave(await requireActor(), doctorId, leaveId);
  revalidatePath(`/doctors/${doctorId}`);
}

export async function uploadSignatureAction(
  doctorId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  try {
    await uploadDoctorSignatureImage(await requireActor(), doctorId, file);
  } catch (error) {
    return { error: publicError(error, "Could not upload signature.") };
  }

  revalidatePath(`/doctors/${doctorId}`);
  return { error: null };
}
