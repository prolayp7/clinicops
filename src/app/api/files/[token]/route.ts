import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { verifyFileToken } from "@/lib/file-token";
import { mimeTypeForStoragePath, resolveLocalStoragePath } from "@/lib/storage/providers/local-disk";

export const runtime = "nodejs";

/** Serves a file from local disk given a short-lived HMAC-signed token (the local-disk storage
 * provider's equivalent of a Supabase signed URL). The token itself is the bearer credential for
 * its TTL, matching the existing Supabase signed-URL behavior documented in
 * docs/release/OPERATIONS.md — there is no separate per-request auth check here. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const storagePath = verifyFileToken(token);
  if (!storagePath) {
    return NextResponse.json({ error: "This link has expired or is invalid." }, { status: 403 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveLocalStoragePath(storagePath);
  } catch {
    return NextResponse.json({ error: "This link has expired or is invalid." }, { status: 403 });
  }

  let size: number;
  try {
    size = (await stat(absolutePath)).size;
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const stream = createReadStream(absolutePath);
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk as Buffer));
      stream.on("end", () => controller.close());
      stream.on("error", (error) => controller.error(error));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": mimeTypeForStoragePath(storagePath),
      "Content-Length": String(size),
      "Cache-Control": "private, no-store",
    },
  });
}
