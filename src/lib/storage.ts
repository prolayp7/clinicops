import "server-only";
import { storageProvider } from "@/lib/storage/providers";

export const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_SIGNATURE_TYPES = new Set(["image/png", "image/jpeg"]);
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LAB_REPORT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_LAB_REPORT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Uploads one attachment under a random key so storage paths never leak patient/consultation
 * identifiers, and returns the path to store on the ConsultationAttachment row. */
export async function uploadConsultationAttachment(
  consultationId: string,
  file: File,
): Promise<{ storagePath: string }> {
  return storageProvider().uploadConsultationAttachment(consultationId, file);
}

export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  return storageProvider().getAttachmentSignedUrl(storagePath);
}

export async function uploadDoctorSignature(doctorId: string, file: File): Promise<string> {
  return storageProvider().uploadDoctorSignature(doctorId, file);
}

export async function getSignatureSignedUrl(storagePath: string): Promise<string | null> {
  return storageProvider().getSignatureSignedUrl(storagePath);
}

/** Fetches a doctor's signature as an inline data URI, for embedding in a server-rendered PDF
 * without the PDF renderer needing its own authenticated fetch to private storage. */
export async function getSignatureDataUri(storagePath: string): Promise<string | null> {
  return storageProvider().getSignatureDataUri(storagePath);
}

export async function uploadLabReport(labOrderId: string, file: File): Promise<string> {
  return storageProvider().uploadLabReport(labOrderId, file);
}

export async function getLabReportSignedUrl(storagePath: string): Promise<string | null> {
  return storageProvider().getLabReportSignedUrl(storagePath);
}

export async function uploadDocument(patientId: string, file: File): Promise<string> {
  return storageProvider().uploadDocument(patientId, file);
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  return storageProvider().getDocumentSignedUrl(storagePath);
}
