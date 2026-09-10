"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/auth/patient-session";
import { requestAppointmentSchema } from "@/lib/validation/portal";
import { requestPortalAppointment } from "@/server/services/portal-service";

export type FormState = { error: string | null; values?: Record<string, string> };

export async function requestAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    doctorId: String(formData.get("doctorId") ?? ""),
    date: String(formData.get("date") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  };

  const parsed = requestAppointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  const patient = await getCurrentPatient();
  if (!patient) redirect("/portal/login");

  try {
    await requestPortalAppointment(patient, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not request the appointment."), values };
  }

  revalidatePath("/portal/appointments");
  redirect("/portal/appointments");
}
