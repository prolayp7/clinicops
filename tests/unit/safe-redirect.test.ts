import { expect, it } from "vitest";
import { safeRedirect } from "@/lib/auth/safe-redirect";

it.each(["//evil.test", "/\\evil.test", "https://evil.test", "/\nevil.test", null])("rejects unsafe redirect %s", (value) => {
  expect(safeRedirect(value)).toBe("/dashboard");
});
it("preserves local destinations", () => expect(safeRedirect("/patients?page=2")).toBe("/patients?page=2"));
