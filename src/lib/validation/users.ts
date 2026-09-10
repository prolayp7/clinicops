import { Role } from "@prisma/client";
import { z } from "zod";

const STAFF_ROLES = Object.values(Role).filter((role) => role !== Role.PATIENT) as [Role, ...Role[]];

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  role: z.enum(STAFF_ROLES),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffRoleSchema = z.object({
  role: z.enum(STAFF_ROLES),
});
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
