// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "clinicops-storage-test-"));
  vi.stubEnv("LOCAL_STORAGE_ROOT", root);
  vi.stubEnv("FILE_SIGNING_SECRET", "test-secret-do-not-use-in-production");
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

function pdfFile(name: string): File {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" }) as unknown as globalThis.File;
}

describe("local-disk storage provider", () => {
  it("writes an uploaded document under the storage root and reads it back", async () => {
    const { localDiskStorageProvider } = await import("@/lib/storage/providers/local-disk");

    const storagePath = await localDiskStorageProvider.uploadDocument("patient-1", pdfFile("report.pdf"));
    expect(storagePath).toMatch(/^patient-documents\/patient-1\/[0-9a-f-]{36}\.pdf$/);

    const onDisk = await readFile(path.join(root, storagePath), "utf8");
    expect(onDisk).toBe("%PDF-1.7");
  });

  it("mints a signed URL that verifies back to the same storage path", async () => {
    const { localDiskStorageProvider } = await import("@/lib/storage/providers/local-disk");
    const { verifyFileToken } = await import("@/lib/file-token");

    const storagePath = await localDiskStorageProvider.uploadDocument("patient-1", pdfFile("report.pdf"));
    const signedUrl = await localDiskStorageProvider.getDocumentSignedUrl(storagePath);

    expect(signedUrl).toMatch(/^\/api\/files\//);
    const token = signedUrl!.replace("/api/files/", "");
    expect(verifyFileToken(token)).toBe(storagePath);
  });

  it("rejects a signature upload that is actually a PDF, matching the Supabase provider's rule", async () => {
    const { localDiskStorageProvider } = await import("@/lib/storage/providers/local-disk");
    await expect(localDiskStorageProvider.uploadDoctorSignature("doctor-1", pdfFile("sig.pdf"))).rejects.toThrow();
  });

  it("refuses to resolve a storage path that escapes the storage root", async () => {
    const { resolveLocalStoragePath } = await import("@/lib/storage/providers/local-disk");
    expect(() => resolveLocalStoragePath("../../etc/passwd")).toThrow("Invalid storage path");
  });

  it("returns null from getSignatureDataUri when the file does not exist", async () => {
    const { localDiskStorageProvider } = await import("@/lib/storage/providers/local-disk");
    await expect(localDiskStorageProvider.getSignatureDataUri("doctor-signatures/missing/none.png")).resolves.toBeNull();
  });
});
