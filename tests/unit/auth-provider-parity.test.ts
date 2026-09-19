// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn(), set: vi.fn() }) }));
vi.mock("@/lib/auth/supabase-server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({}) }));

import { supabaseAuthProvider } from "@/lib/auth/providers/supabase";
import { selfhostedAuthProvider } from "@/lib/auth/providers/selfhosted";
import { supabaseStorageProvider } from "@/lib/storage/providers/supabase";
import { localDiskStorageProvider } from "@/lib/storage/providers/local-disk";
import type { AuthProvider } from "@/lib/auth/providers/types";
import type { StorageProvider } from "@/lib/storage/providers/types";

const AUTH_METHODS: (keyof AuthProvider)[] = [
  "getAuthUserId",
  "signIn",
  "signOut",
  "adminCreateUser",
  "adminSetPassword",
];

const STORAGE_METHODS: (keyof StorageProvider)[] = [
  "uploadConsultationAttachment",
  "getAttachmentSignedUrl",
  "uploadDoctorSignature",
  "getSignatureSignedUrl",
  "getSignatureDataUri",
  "uploadLabReport",
  "getLabReportSignedUrl",
  "uploadDocument",
  "getDocumentSignedUrl",
];

describe("provider parity", () => {
  it("both auth providers implement every AuthProvider method", () => {
    for (const method of AUTH_METHODS) {
      expect(typeof supabaseAuthProvider[method]).toBe("function");
      expect(typeof selfhostedAuthProvider[method]).toBe("function");
    }
  });

  it("both storage providers implement every StorageProvider method", () => {
    for (const method of STORAGE_METHODS) {
      expect(typeof supabaseStorageProvider[method]).toBe("function");
      expect(typeof localDiskStorageProvider[method]).toBe("function");
    }
  });
});
