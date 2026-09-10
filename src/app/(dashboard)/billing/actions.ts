"use server";

import { publicError } from "@/lib/public-error";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
  recordRefundSchema,
  updateInvoiceAdjustmentsSchema,
} from "@/lib/validation/billing";
import {
  addInvoiceItem,
  createInvoice,
  recordPayment,
  recordRefund,
  removeInvoiceItem,
  updateInvoiceAdjustments,
} from "@/server/services/invoices-service";

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

export type FormState = { error: string | null; values?: Record<string, string> };

export async function createInvoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    patientId: String(formData.get("patientId") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = createInvoiceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  let invoiceId: string;
  try {
    const invoice = await createInvoice(await requireActor(), parsed.data);
    invoiceId = invoice.id;
  } catch (error) {
    return { error: publicError(error, "Could not create invoice."), values };
  }

  revalidatePath("/billing");
  redirect(`/billing/${invoiceId}`);
}

export async function addItemAction(invoiceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  // Monetary values are stored as integer cents; the form collects dollars for readability.
  const dollars = Number(formData.get("unitPriceDollars"));
  const values = {
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
    unitPriceCents: String(Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN),
    consultationId: String(formData.get("consultationId") ?? ""),
    labOrderId: String(formData.get("labOrderId") ?? ""),
  };

  const parsed = invoiceItemSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.", values };
  }

  try {
    await addInvoiceItem(await requireActor(), invoiceId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not add line item."), values };
  }

  revalidatePath(`/billing/${invoiceId}`);
  return { error: null };
}

export async function removeItemAction(invoiceId: string, itemId: string) {
  await removeInvoiceItem(await requireActor(), invoiceId, itemId);
  revalidatePath(`/billing/${invoiceId}`);
}

export async function updateAdjustmentsAction(
  invoiceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Monetary values are stored as integer cents; the form collects dollars for readability.
  const toCents = (key: string) => Math.round((Number(formData.get(key)) || 0) * 100);
  const values = {
    discountCents: String(toCents("discountDollars")),
    taxCents: String(toCents("taxDollars")),
    adjustmentCents: String(toCents("adjustmentDollars")),
  };

  const parsed = updateInvoiceAdjustmentsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await updateInvoiceAdjustments(await requireActor(), invoiceId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not update totals.") };
  }

  revalidatePath(`/billing/${invoiceId}`);
  return { error: null };
}

export async function recordPaymentAction(
  invoiceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const dollars = Number(formData.get("amountDollars"));
  const values = {
    amountCents: String(Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN),
    method: String(formData.get("method") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  };

  const parsed = recordPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await recordPayment(await requireActor(), invoiceId, parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not record payment.") };
  }

  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  return { error: null };
}

export async function recordRefundAction(
  invoiceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const dollars = Number(formData.get("amountDollars"));
  const values = {
    paymentId: String(formData.get("paymentId") ?? ""),
    amountCents: String(Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN),
    reason: String(formData.get("reason") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  };

  const parsed = recordRefundSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    await recordRefund(await requireActor(), parsed.data);
  } catch (error) {
    return { error: publicError(error, "Could not record refund.") };
  }

  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  return { error: null };
}
