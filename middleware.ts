import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/protected-paths";

/** Under AUTH_PROVIDER=selfhosted this middleware does not gate /dashboard* at all: session
 * validation needs a Postgres lookup (via Prisma), and Prisma cannot run in Next's Edge
 * middleware runtime — this installed Next.js version has no Node.js-runtime middleware option
 * (confirmed empirically: `export const runtime = "nodejs"` here silently drops the middleware
 * from the build with no error, and there is no `experimental.nodeMiddleware` flag available).
 * This is not a security gap: every /dashboard page already calls getCurrentUser() itself and
 * redirects if unauthenticated — exactly the same pattern /portal/* already relies on today
 * (it has never been middleware-gated, Supabase or otherwise). Middleware here is strictly an
 * early UX redirect for the Supabase path, never the sole enforcement point. */
export async function middleware(request: NextRequest) {
  if (process.env.AUTH_PROVIDER === "selfhosted") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
