import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";

beforeEach(() => vi.clearAllMocks());

describe("enforceRateLimit", () => {
  it("allows attempts at or under the scope's cap", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 10 }]);
    await expect(enforceRateLimit("staff-login", "a@example.test")).resolves.toBeUndefined();
  });

  it("throws once the count exceeds the cap", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 11 }]);
    await expect(enforceRateLimit("staff-login", "a@example.test")).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("normalizes the identifier into the bucket key so casing/whitespace share a bucket", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 1 }]);
    await enforceRateLimit("password-reset-request", "  A@Example.test ");
    const [, key] = db.$queryRaw.mock.calls[0] as [TemplateStringsArray, string];
    expect(key).toBe("password-reset-request:a@example.test");
  });
});
