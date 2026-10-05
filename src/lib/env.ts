import { z } from "zod";

const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    CLINIC_TIMEZONE: z.string().min(1).default("America/New_York"),
    CRON_SECRET: z.string().min(32).optional(),
    AUTH_PROVIDER: z.enum(["supabase", "selfhosted"]).default("supabase"),
    AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
    STORAGE_PROVIDER: z.enum(["supabase", "selfhosted"]).default("supabase"),
    LOCAL_STORAGE_ROOT: z.string().min(1).optional(),
    FILE_SIGNING_SECRET: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_PROVIDER === "selfhosted" && !env.LOCAL_STORAGE_ROOT) {
      ctx.addIssue({
        code: "custom",
        path: ["LOCAL_STORAGE_ROOT"],
        message: "LOCAL_STORAGE_ROOT is required when STORAGE_PROVIDER=selfhosted.",
      });
    }
    if (env.STORAGE_PROVIDER === "selfhosted" && !env.FILE_SIGNING_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["FILE_SIGNING_SECRET"],
        message: "FILE_SIGNING_SECRET is required when STORAGE_PROVIDER=selfhosted.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validates process.env once and caches the result; throws on first access if misconfigured. */
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
