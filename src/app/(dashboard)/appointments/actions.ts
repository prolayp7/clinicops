"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  bookAppointmentSchema,
  changeStatusSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validation/appointments";
import {
  AppointmentConflictError,
  AvailabilityWarningError,
  bookAppointment,
  changeAppointmentStatus,
  rescheduleAppointment,
} from "@/server/services/appointments-service";
import type { AppointmentStatus } from "@prisma/client";

export type FormState = {
  error: string | null;
  availabilityWarning?: string;
  values?: Record<string, string>;
};

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

const BOOKING_FIELD_NAMES = ["patientId", "doctorId", "date", "startTime", "reason", "source"] as const;

function captureValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of BOOKING_FIELD_NAMES) values[name] = String(formData.get(name) ?? "");
  return values;
}

export async function bookAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = captureValues(formData);
  const parsed = bookAppointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  const force = formData.get("force") === "true";
  let appointmentId: string;
  try {
    const appointment = await bookAppointment(await requireActor(), parsed.data, { force });
    appointmentId = appointment.id;
  } catch (error) {
    if (error instanceof AvailabilityWarningError) {
      return { error: null, availabilityWarning: error.message, values };
    }
    if (error instanceof AppointmentConflictError) {
      return { error: error.message, values };
    }
    return { error: publicError(error, "Could not book appointment."), values };
  }

  revalidatePath("/appointments");
  redirect(`/appointments/${appointmentId}`);
}

const RESCHEDULE_FIELD_NAMES = ["date", "startTime", "reason"] as const;

export async function rescheduleAppointmentAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const name of RESCHEDULE_FIELD_NAMES) values[name] = String(formData.get(name) ?? "");

  const parsed = rescheduleAppointmentSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  const force = formData.get("force") === "true";
  try {
    await rescheduleAppointment(await requireActor(), id, parsed.data, { force });
  } catch (error) {
    if (error instanceof AvailabilityWarningError) {
      return { error: null, availabilityWarning: error.message, values };
    }
    return {
      error: publicError(error, "Could not reschedule appointment."),
      values,
    };
  }

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  return { error: null };
}

export type StatusFormState = { error: string | null };

export async function changeStatusAction(
  id: string,
  fromStatus: AppointmentStatus,
  toStatus: AppointmentStatus,
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  const parsed = changeStatusSchema.safeParse({
    fromStatus,
    toStatus,
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await changeAppointmentStatus(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update status.") };
  }

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  return { error: null };
}
