import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().max(256).default(""),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
