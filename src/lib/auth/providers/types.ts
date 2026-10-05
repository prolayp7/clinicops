export type AuthSubject = "staff" | "patient";

export type SignInResult = { ok: true; authUserId: string } | { ok: false; error: string };
export type AdminCreateResult = { authUserId: string; passwordHash: string | null } | { error: string };
export type PasswordResetResult = { ok: true; authUserId: string } | { ok: false; error: string };
export type AdminPasswordResult = { passwordHash: string | null } | { error: string };
export type AdminEmailResult = { ok: true } | { error: string };

/** Provider-agnostic identity boundary. Both staff and patient auth share this shape — the
 * logic is identical for each, only the underlying table differs (see providers/*.ts). Callers
 * (session.ts, patient-session.ts, login/logout actions, users-service.ts,
 * patient-accounts-service.ts) stay unaware of which provider is active. */
export interface AuthProvider {
  /** Resolves the caller's own auth-provider user id from the current request's cookies, or
   * null if unauthenticated. Does not check StaffProfile/PatientAccount status — callers do
   * that themselves against their own table (this keeps the archived-user guarantee in one
   * place per subject, not duplicated per provider). */
  getAuthUserId(subject: AuthSubject): Promise<string | null>;
  signIn(subject: AuthSubject, email: string, password: string): Promise<SignInResult>;
  signOut(subject: AuthSubject): Promise<void>;
  adminCreateUser(subject: AuthSubject, email: string, password: string): Promise<AdminCreateResult>;
  adminSetPassword(subject: AuthSubject, authUserId: string, password: string): Promise<AdminPasswordResult>;
  adminUpdateEmail(subject: AuthSubject, authUserId: string, email: string): Promise<AdminEmailResult>;
  /** Staff self-service reset, step 1: emails a reset link if an ACTIVE account exists. Returns
   * the account id when known (for auditing) and null otherwise — callers must not reveal which. */
  requestPasswordReset(email: string): Promise<{ authUserId: string | null }>;
  /** Step 2: sets a new password. Self-hosted validates the emailed one-time token; Supabase uses
   * the recovery session established by /auth/callback and ignores the token. */
  resetPassword(token: string, password: string): Promise<PasswordResetResult>;
}
