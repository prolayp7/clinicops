import "server-only";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { adminClient } from "@/lib/supabase/admin";
import type { AuthProvider } from "./types";

export const supabaseAuthProvider: AuthProvider = {
  async getAuthUserId() {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  },

  async signIn(_subject, email, password) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Invalid email or password." };
    }
    return { ok: true, authUserId: data.user.id };
  },

  async signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  },

  async adminCreateUser(_subject, email, password) {
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return { error: error?.message ?? "Could not create the login." };
    }
    return { authUserId: data.user.id, passwordHash: null };
  },

  async adminSetPassword(_subject, authUserId, password) {
    const { error } = await adminClient().auth.admin.updateUserById(authUserId, { password });
    if (error) return { error: error.message };
    return { passwordHash: null };
  },

  async requestPasswordReset(email) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("APP_URL is not configured.");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl}/auth/callback` });
    return { authUserId: null };
  },

  async resetPassword(_token, password) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "This reset link is invalid or has expired." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    await supabase.auth.signOut();
    return { ok: true, authUserId: user.id };
  },
};
