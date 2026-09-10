"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  changeLabOrderStatusSchema,
  createLabOrderSchema,
  saveResultsSchema,
} from "@/lib/validation/lab-orders";
import {
  addLabReport,
  changeLabOrderStatus,
  createLabOrder,
  saveResults,
} from "@/server/services/lab-orders-service";
import type { LabOrderStatus } from "@prisma/client";

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

export type FormState = { error: string | null; values?: Record<string, string> };

export async function createLabOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    patientId: String(formData.get("patientId") ?? ""),
    consultationId: String(formData.get("consultationId") ?? ""),
  };
  const testIds = formData.getAll("testIds").map(String);

  const parsed = createLabOrderSchema.safeParse({ ...values, testIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  let orderId: string;
  try {
    const order = await createLabOrder(await requireActor(), parsed.data);
    orderId = order.id;
  } catch (error) {
    return { error: publicError(error, "Could not create lab order."), values };
  }

  revalidatePath("/laboratory");
  redirect(`/laboratory/${orderId}`);
}

export type StatusFormState = { error: string | null };

export async function changeStatusAction(
  id: string,
  fromStatus: LabOrderStatus,
  toStatus: LabOrderStatus,
  _prev: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  const parsed = changeLabOrderStatusSchema.safeParse({
    fromStatus,
    toStatus,
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await changeLabOrderStatus(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update status.") };
  }

  revalidatePath("/laboratory");
  revalidatePath(`/laboratory/${id}`);
  return { error: null };
}

export type ResultsFormState = { error: string | null };

export async function saveResultsAction(
  id: string,
  itemIds: string[],
  _prev: ResultsFormState,
  formData: FormData,
): Promise<ResultsFormState> {
  const items = itemIds.map((itemId) => ({
    itemId,
    resultValue: String(formData.get(`item-${itemId}-resultValue`) ?? ""),
    unit: String(formData.get(`item-${itemId}-unit`) ?? ""),
    referenceRange: String(formData.get(`item-${itemId}-referenceRange`) ?? ""),
    abnormalFlag: String(formData.get(`item-${itemId}-abnormalFlag`) ?? "NORMAL"),
  }));

  const parsed = saveResultsSchema.safeParse({ items });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await saveResults(await requireActor(), id, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not save results.") };
  }

  revalidatePath(`/laboratory/${id}`);
  return { error: null };
}

export type ReportFormState = { error: string | null };

export async function addReportAction(
  id: string,
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  try {
    await addLabReport(await requireActor(), id, file);
  } catch (error) {
    return { error: publicError(error, "Could not upload report.") };
  }

  revalidatePath(`/laboratory/${id}`);
  return { error: null };
}
