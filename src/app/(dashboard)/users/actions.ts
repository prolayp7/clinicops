"use server";

import { revalidatePath } from "next/cache";
import type { StaffStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { createStaffSchema, updateStaffRoleSchema } from "@/lib/validation/users";
import {
  createStaffUser,
  resetStaffPassword,
  setStaffStatus,
  updateStaffRole,
} from "@/server/services/users-service";

export type StaffFormState = { error: string | null; temporaryPassword?: string };

async function requireActor() {
  const actor = await getCurrentUser();
  if (!actor) throw new Error("Not authenticated.");
  return actor;
}

export async function createStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = createStaffSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
  }

  try {
    const { temporaryPassword } = await createStaffUser(await requireActor(), parsed.data);
    revalidatePath("/users");
    return { error: null, temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the staff account." };
  }
}

export async function updateStaffRoleAction(
  staffId: string,
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = updateStaffRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Select a valid role." };
  }

  try {
    await updateStaffRole(await requireActor(), staffId, parsed.data.role);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the role." };
  }

  revalidatePath("/users");
  return { error: null };
}

export async function toggleStaffStatusAction(staffId: string, nextStatus: StaffStatus) {
  await setStaffStatus(await requireActor(), staffId, nextStatus);
  revalidatePath("/users");
}

export async function resetStaffPasswordAction(
  staffId: string,
  _prev: StaffFormState,
): Promise<StaffFormState> {
  try {
    const { temporaryPassword } = await resetStaffPassword(await requireActor(), staffId);
    return { error: null, temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reset the password." };
  }
}
