import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validatePrivateFile } from "@/lib/validation/private-file";

const ATTACHMENTS_BUCKET = "consultation-attachments";
const SIGNATURES_BUCKET = "doctor-signatures";
const LAB_REPORTS_BUCKET = "lab-reports";
const DOCUMENTS_BUCKET = "patient-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_SIGNATURE_TYPES = new Set(["image/png", "image/jpeg"]);
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LAB_REPORT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_LAB_REPORT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Exported so the patient-account admin helper can reuse the same service-role client for the
 * Supabase Auth admin API (creating/managing patient portal logins). */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureBucket(bucket: string) {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error || !data || data.public) throw new Error("Private storage is not configured.");
}

async function uploadPrivateFile(bucket: string, keyPrefix: string, file: File): Promise<string> {
  const extension = await validatePrivateFile(file, bucket === SIGNATURES_BUCKET);
  await ensureBucket(bucket);
  const supabase = adminClient();
  const storagePath = `${keyPrefix}/${randomUUID()}${extension ? `.${extension}` : ""}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type });
  if (error) throw new Error("Upload failed. Please retry.");

  return storagePath;
}

/** Uploads one attachment under a random key so storage paths never leak patient/consultation
 * identifiers, and returns the path to store on the ConsultationAttachment row. */
export async function uploadConsultationAttachment(
  consultationId: string,
  file: File,
): Promise<{ storagePath: string }> {
  const storagePath = await uploadPrivateFile(ATTACHMENTS_BUCKET, consultationId, file);
  return { storagePath };
}

export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = adminClient();
  await ensureBucket(ATTACHMENTS_BUCKET);
  const { data } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function uploadDoctorSignature(doctorId: string, file: File): Promise<string> {
  return uploadPrivateFile(SIGNATURES_BUCKET, doctorId, file);
}

export async function getSignatureSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = adminClient();
  await ensureBucket(SIGNATURES_BUCKET);
  const { data } = await supabase.storage
    .from(SIGNATURES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/** Fetches a doctor's signature as an inline data URI, for embedding in a server-rendered PDF
 * without the PDF renderer needing its own authenticated fetch to private storage. */
export async function getSignatureDataUri(storagePath: string): Promise<string | null> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(SIGNATURES_BUCKET).download(storagePath);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return `data:${data.type};base64,${buffer.toString("base64")}`;
}

export async function uploadLabReport(labOrderId: string, file: File): Promise<string> {
  return uploadPrivateFile(LAB_REPORTS_BUCKET, labOrderId, file);
}

export async function getLabReportSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = adminClient();
  await ensureBucket(LAB_REPORTS_BUCKET);
  const { data } = await supabase.storage
    .from(LAB_REPORTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function uploadDocument(patientId: string, file: File): Promise<string> {
  return uploadPrivateFile(DOCUMENTS_BUCKET, patientId, file);
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = adminClient();
  await ensureBucket(DOCUMENTS_BUCKET);
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
