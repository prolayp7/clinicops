import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

/** Sends via SMTP_URL (+ MAIL_FROM). Missing SMTP configuration fails closed; message contents
 * are never written to application logs. */
export async function sendMail(mail: Mail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) throw new Error("SMTP_URL is not configured.");
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM is not configured.");
  await nodemailer.createTransport(smtpUrl).sendMail({ from, ...mail });
}
