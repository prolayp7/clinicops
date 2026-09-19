// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "clinicops-files-route-test-"));
  vi.stubEnv("LOCAL_STORAGE_ROOT", root);
  vi.stubEnv("FILE_SIGNING_SECRET", "test-secret-do-not-use-in-production");
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

describe("GET /api/files/[token]", () => {
  it("streams the file back for a valid token", async () => {
    const { createFileToken } = await import("@/lib/file-token");
    const { GET } = await import("@/app/api/files/[token]/route");

    const storagePath = "patient-documents/patient-1/report.pdf";
    await mkdir(path.dirname(path.join(root, storagePath)), { recursive: true });
    await writeFile(path.join(root, storagePath), "%PDF-1.7");

    const token = createFileToken(storagePath);
    const response = await GET(new Request("http://localhost/api/files/" + token), {
      params: Promise.resolve({ token }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.text();
    expect(body).toBe("%PDF-1.7");
  });

  it("returns 403 for a tampered or expired token", async () => {
    const { GET } = await import("@/app/api/files/[token]/route");
    const response = await GET(new Request("http://localhost/api/files/garbage"), {
      params: Promise.resolve({ token: "garbage" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 404 when the token is valid but the file is missing", async () => {
    const { createFileToken } = await import("@/lib/file-token");
    const { GET } = await import("@/app/api/files/[token]/route");

    const token = createFileToken("patient-documents/patient-1/does-not-exist.pdf");
    const response = await GET(new Request("http://localhost/api/files/" + token), {
      params: Promise.resolve({ token }),
    });
    expect(response.status).toBe(404);
  });
});
