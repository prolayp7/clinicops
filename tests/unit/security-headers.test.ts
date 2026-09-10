// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it.each(["development", "production", "test"] as const)("limits CSP eval permission to development (%s)", async (environment) => {
  vi.stubEnv("NODE_ENV", environment);
  const configPath = "../../next.config.mjs";
  const { default: config } = await import(configPath) as {
    default: { headers(): Promise<Array<{ headers: Array<{ key: string; value: string }> }>> };
  };
  const rules = await config.headers();
  const policy = rules[0]?.headers.find(header => header.key === "Content-Security-Policy")?.value;
  expect(policy).toBeDefined();
  const scripts = policy?.split(";").find(directive => directive.trim().startsWith("script-src "));
  expect(scripts?.includes("'unsafe-eval'")).toBe(environment === "development");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
});
