import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/auth/protected-paths";
import { NAV_ITEMS } from "@/lib/permissions/roles";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/callback", "/portal/login"];

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

  it("protects every staff navigation route, not just /dashboard", () => {
    for (const item of NAV_ITEMS) {
      expect(isProtectedPath(item.href), item.href).toBe(true);
      expect(isProtectedPath(`${item.href}/anything`), item.href).toBe(true);
    }
  });

  it("leaves the authentication pages public", () => {
    for (const path of PUBLIC_PATHS) expect(isProtectedPath(path), path).toBe(false);
  });
});
