import { z } from "zod";

/** Shared pagination query schema; every list endpoint caps page size to avoid unbounded scans. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
