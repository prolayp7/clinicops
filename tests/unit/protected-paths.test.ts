import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/auth/protected-paths";

describe("isProtectedPath", () => {
  it("protects the dashboard root and nested routes", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/settings")).toBe(true);
  });

  it("does not protect the login page or marketing routes", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("does not treat an unrelated path with the same prefix as protected", () => {
    expect(isProtectedPath("/dashboard-preview")).toBe(false);
  });
});
