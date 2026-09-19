/** Staff path prefixes (the (dashboard) route group adds no URL segment) that require an authenticated session. Kept pure/data-only so middleware
 * behavior can be unit tested without booting Next.js. */
export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/patients",
  "/doctors",
  "/appointments",
  "/consultations",
  "/prescriptions",
  "/laboratory",
  "/billing",
  "/documents",
  "/reports",
  "/users",
  "/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
