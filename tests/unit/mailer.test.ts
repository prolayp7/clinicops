import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendMail } from "@/lib/mailer";

describe("sendMail", () => {
  const initialSmtpUrl = process.env.SMTP_URL;

  afterEach(() => {
    if (initialSmtpUrl === undefined) delete process.env.SMTP_URL;
    else process.env.SMTP_URL = initialSmtpUrl;
    vi.restoreAllMocks();
  });

  it("fails closed without SMTP and never logs message contents", async () => {
    delete process.env.SMTP_URL;
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendMail({
      to: "synthetic.patient@example.test",
      subject: "Appointment reminder",
      text: "Synthetic appointment details",
    })).rejects.toThrow("SMTP_URL is not configured");
    expect(info).not.toHaveBeenCalled();
  });
});