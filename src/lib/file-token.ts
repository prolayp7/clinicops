import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 60 * 10;

function secret(): string {
  const value = process.env.FILE_SIGNING_SECRET;
  if (!value) throw new Error("FILE_SIGNING_SECRET is not configured.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Mints a short-lived token authorizing a GET of exactly this storage path, for the local-disk
 * storage provider's signed-URL equivalent (there is no CDN to hand a pre-signed URL to). */
export function createFileToken(storagePath: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${storagePath}.${expiresAt}`;
  const payloadEncoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadEncoded}.${sign(payload)}`;
}

/** Verifies a token minted by createFileToken and returns the storage path it authorizes, or
 * null if the token is malformed, tampered with, or expired. */
export function verifyFileToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadEncoded, providedSignature] = parts;

  let payload: string;
  try {
    payload = Buffer.from(payloadEncoded!, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = sign(payload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature!);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  const lastDot = payload.lastIndexOf(".");
  if (lastDot === -1) return null;
  const storagePath = payload.slice(0, lastDot);
  const expiresAt = Number(payload.slice(lastDot + 1));
  if (!Number.isFinite(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) return null;

  return storagePath;
}
