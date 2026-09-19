import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

/** Supabase recovery-email landing: exchanges the one-time code for a short session, then hands
 * off to /reset-password. Only used when AUTH_PROVIDER=supabase. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (process.env.AUTH_PROVIDER === "selfhosted" || !code) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/forgot-password" : "/reset-password", request.url));
}
