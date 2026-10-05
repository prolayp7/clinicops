import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const processDueReminders = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/reminder-service", () => ({ processDueReminders }));

import { GET } from "@/app/api/cron/reminders/route";

const originalSecret = process.env.CRON_SECRET;
const secret = "test-cron-secret-with-at-least-32-characters";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = secret;
  processDueReminders.mockResolvedValue(3);
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("reminder cron route", () => {
  it("fails closed when no cron secret is configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(new Request("http://localhost/api/cron/reminders"));

    expect(response.status).toBe(503);
    expect(processDueReminders).not.toHaveBeenCalled();
  });

  it("rejects missing or incorrect bearer authorization", async () => {
    const response = await GET(new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer wrong-secret" },
    }));

    expect(response.status).toBe(401);
    expect(processDueReminders).not.toHaveBeenCalled();
  });

  it("processes due reminders only with the configured bearer secret", async () => {
    const response = await GET(new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ processed: 3 });
    expect(processDueReminders).toHaveBeenCalledOnce();
  });
});
