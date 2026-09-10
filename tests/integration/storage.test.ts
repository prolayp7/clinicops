import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const storage = vi.hoisted(() => ({ getBucket: vi.fn(), from: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ storage }) }));
import { getDocumentSignedUrl } from "@/lib/storage";
beforeEach(() => vi.resetAllMocks());
it.each([
  { data: { public: true }, error: null },
  { data: null, error: { message: "missing" } },
])("refuses to sign from missing or public storage", async (result) => {
  storage.getBucket.mockResolvedValue(result);
  await expect(getDocumentSignedUrl("synthetic.pdf")).rejects.toThrow("Private storage is not configured");
  expect(storage.from).not.toHaveBeenCalled();
});
it("issues a ten-minute link only after a private-bucket check", async () => {
  storage.getBucket.mockResolvedValue({ data: { public: false }, error: null });
  const sign = vi.fn().mockResolvedValue({ data: { signedUrl: "synthetic-signed-url" } });
  storage.from.mockReturnValue({ createSignedUrl: sign });
  await expect(getDocumentSignedUrl("synthetic.pdf")).resolves.toBe("synthetic-signed-url");
  expect(sign).toHaveBeenCalledWith("synthetic.pdf", 600);
});
