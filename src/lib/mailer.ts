import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

/** Sends via SMTP_URL (+ MAIL_FROM). Without SMTP_URL, non-production logs the message to the
 * server console for local development; production throws rather than silently dropping mail. */
export async function sendMail(mail: Mail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL is not configured.");
    console.info(`[mail:dev] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    return;
  }
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM is not configured.");
  await nodemailer.createTransport(smtpUrl).sendMail({ from, ...mail });
}
