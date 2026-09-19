import "server-only";
import type { StorageProvider } from "./types";
import { supabaseStorageProvider } from "./supabase";
import { localDiskStorageProvider } from "./local-disk";

let cached: StorageProvider | undefined;

export function storageProvider(): StorageProvider {
  if (!cached) {
    cached = process.env.STORAGE_PROVIDER === "selfhosted" ? localDiskStorageProvider : supabaseStorageProvider;
  }
  return cached;
}
