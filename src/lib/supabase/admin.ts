import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client. Used by the Supabase auth provider (Auth Admin API) and the
 * Supabase storage provider (Storage buckets) — kept independent of which provider is active for
 * the other concern, so a STORAGE_PROVIDER=selfhosted deployment can still run AUTH_PROVIDER=supabase
 * (or vice versa) without one accidentally gating the other. */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
