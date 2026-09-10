/** Provider/ORM errors can embed queries and parameters; never return them to a browser. */
export function publicError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.name.startsWith("Prisma")) return fallback;
  return error.message;
}
