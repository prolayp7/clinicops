import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFileToken } from "@/lib/file-token";
import { validatePrivateFile } from "@/lib/validation/private-file";
import type { StorageProvider } from "./types";

const ATTACHMENTS_PREFIX = "consultation-attachments";
const SIGNATURES_PREFIX = "doctor-signatures";
const LAB_REPORTS_PREFIX = "lab-reports";
const DOCUMENTS_PREFIX = "patient-documents";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function storageRoot(): string {
  const root = process.env.LOCAL_STORAGE_ROOT;
  if (!root) throw new Error("LOCAL_STORAGE_ROOT is not configured.");
  return root;
}

/** Resolves a storagePath to an absolute file path, refusing anything that would escape the
 * storage root (defense in depth — storagePath values are always ones we minted ourselves, via
 * randomUUID(), so this should never trigger, but the check is cheap and the failure mode of
 * skipping it is a path-traversal read). */
function resolvePath(storagePath: string): string {
  const root = path.resolve(storageRoot());
  const resolved = path.resolve(root, storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}

export function mimeTypeForStoragePath(storagePath: string): string {
  const extension = storagePath.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[extension] ?? "application/octet-stream";
}

export function resolveLocalStoragePath(storagePath: string): string {
  return resolvePath(storagePath);
}

async function uploadPrivateFile(keyPrefix: string, file: File, signatureOnly: boolean): Promise<string> {
  const extension = await validatePrivateFile(file, signatureOnly);
  const storagePath = `${keyPrefix}/${randomUUID()}${extension ? `.${extension}` : ""}`;
  const absolutePath = resolvePath(storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  return storagePath;
}

async function signedUrlFor(storagePath: string): Promise<string> {
  return `/api/files/${createFileToken(storagePath)}`;
}

export const localDiskStorageProvider: StorageProvider = {
  async uploadConsultationAttachment(consultationId, file) {
    const storagePath = await uploadPrivateFile(`${ATTACHMENTS_PREFIX}/${consultationId}`, file, false);
    return { storagePath };
  },

  async getAttachmentSignedUrl(storagePath) {
    return signedUrlFor(storagePath);
  },

  async uploadDoctorSignature(doctorId, file) {
    return uploadPrivateFile(`${SIGNATURES_PREFIX}/${doctorId}`, file, true);
  },

  async getSignatureSignedUrl(storagePath) {
    return signedUrlFor(storagePath);
  },

  async getSignatureDataUri(storagePath) {
    try {
      const buffer = await readFile(resolvePath(storagePath));
      return `data:${mimeTypeForStoragePath(storagePath)};base64,${buffer.toString("base64")}`;
    } catch {
      return null;
    }
  },

  async uploadLabReport(labOrderId, file) {
    return uploadPrivateFile(`${LAB_REPORTS_PREFIX}/${labOrderId}`, file, false);
  },

  async getLabReportSignedUrl(storagePath) {
    return signedUrlFor(storagePath);
  },

  async uploadDocument(patientId, file) {
    return uploadPrivateFile(`${DOCUMENTS_PREFIX}/${patientId}`, file, false);
  },

  async getDocumentSignedUrl(storagePath) {
    return signedUrlFor(storagePath);
  },
};
