/** Path prefixes that require an authenticated session. Kept pure/data-only so middleware
 * behavior can be unit tested without booting Next.js. */
export const PROTECTED_PATH_PREFIXES = ["/dashboard"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
