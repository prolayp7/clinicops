import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { prisma } from "@/lib/db/prisma";

const PAGE_SIZE = 20;

const doctorSearchQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!can(actor.profile.role, "appointments:view")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = doctorSearchQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid doctor search." }, { status: 400 });
  }

  const { q, page } = parsed.data;
  const items = await prisma.doctor.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { department: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      department: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  return NextResponse.json(
    { items: items.slice(0, PAGE_SIZE), hasMore: items.length > PAGE_SIZE },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}