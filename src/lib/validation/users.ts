import { Role, StaffStatus } from "@prisma/client";
import { z } from "zod";

const STAFF_ROLE_VALUES = Object.values(Role).filter((role) => role !== Role.PATIENT) as [Role, ...Role[]];

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  role: z.enum(STAFF_ROLE_VALUES),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffRoleSchema = z.object({
  role: z.enum(STAFF_ROLE_VALUES),
});
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;

export const updateStaffProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
});
export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;

const optionalDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    })
    .optional(),
);

const pageNumberSchema = z.coerce.number().int().min(1).max(10_000).catch(1);

export const staffListFiltersSchema = z.object({
  search: z.string().trim().max(100).default(""),
  role: z.enum(STAFF_ROLE_VALUES).optional(),
  status: z.nativeEnum(StaffStatus).default(StaffStatus.ACTIVE),
  page: pageNumberSchema,
});

export const auditLogFiltersSchema = z.object({
  search: z.string().trim().max(100).default(""),
  actorRole: z.nativeEnum(Role).optional(),
  from: optionalDateSchema,
  to: optionalDateSchema,
  page: pageNumberSchema,
}).superRefine((filters, context) => {
  if (filters.from && filters.to && filters.from > filters.to) {
    context.addIssue({ code: "custom", path: ["to"], message: "End date must be on or after start date." });
  }
});
