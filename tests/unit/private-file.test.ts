// @vitest-environment node
import { File } from "node:buffer";
import { describe, expect, it } from "vitest";
import { validatePrivateFile } from "@/lib/validation/private-file";

describe("private upload validation", () => {
  it("accepts a PDF with matching extension, MIME and signature", async () => {
    await expect(validatePrivateFile(new File(["%PDF-1.7"], "test.PDF", { type: "application/pdf" }) as unknown as globalThis.File)).resolves.toBe("pdf");
  });
  it.each([
    ["fake.pdf", "application/pdf", "<script>"],
    ["fake.html", "application/pdf", "%PDF-1.7"],
    ["empty.pdf", "application/pdf", ""],
    ["bad.svg", "image/svg+xml", "<svg/>"],
  ])("rejects %s", async (name, type, body) => {
    await expect(validatePrivateFile(new File([body], name, { type }) as unknown as globalThis.File)).rejects.toThrow();
  });
  it("rejects PDFs as doctor signatures", async () => {
    await expect(validatePrivateFile(new File(["%PDF-1.7"], "test.pdf", { type: "application/pdf" }) as unknown as globalThis.File, true)).rejects.toThrow();
  });
  it("rejects oversized uploads", async () => {
    await expect(validatePrivateFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "test.pdf", { type: "application/pdf" }) as unknown as globalThis.File)).rejects.toThrow();
  });
});
