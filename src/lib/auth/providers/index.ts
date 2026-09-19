import "server-only";
import type { AuthProvider } from "./types";
import { supabaseAuthProvider } from "./supabase";
import { selfhostedAuthProvider } from "./selfhosted";

let cached: AuthProvider | undefined;

export function authProvider(): AuthProvider {
  if (!cached) {
    cached = process.env.AUTH_PROVIDER === "selfhosted" ? selfhostedAuthProvider : supabaseAuthProvider;
  }
  return cached;
}

export type { AuthProvider, AuthSubject, SignInResult, AdminCreateResult, AdminPasswordResult, PasswordResetResult } from "./types";
export { resolveSelfhostedToken, COOKIE_NAME as SELFHOSTED_COOKIE_NAME } from "./selfhosted";
