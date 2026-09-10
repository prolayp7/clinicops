import { describe, expect, it } from "vitest";
import { uploadDocumentSchema } from "@/lib/validation/documents";

const uuid = "8f14e45f-ceea-467e-a3d8-4d3f9e2e6b3a";

describe("uploadDocumentSchema", () => {
  it("accepts a category with no linked consultation or lab order", () => {
    expect(uploadDocumentSchema.safeParse({ categoryId: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid category id", () => {
    expect(uploadDocumentSchema.safeParse({ categoryId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts an optional consultation or lab order link", () => {
    expect(uploadDocumentSchema.safeParse({ categoryId: uuid, consultationId: uuid }).success).toBe(true);
    expect(uploadDocumentSchema.safeParse({ categoryId: uuid, labOrderId: uuid }).success).toBe(true);
  });
});
