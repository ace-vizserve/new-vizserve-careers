import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { appendToSentFolder } from "@/lib/imap";

/**
 * SMTP mailer for the recruiting inbox.
 *
 * Connects to GoDaddy Professional Email's SMTP server and sends
 * mail as the configured mailbox. The mailbox owner stays in
 * GoDaddy — we just borrow its outgoing server.
 *
 * After SMTP delivery we also IMAP-APPEND the same raw message into
 * the Sent folder. Without that step Outlook/webmail never see what
 * we sent (SMTP doesn't touch the user's mailbox folders) — the
 * conversation only surfaces when the recipient replies.
 *
 * Env vars required:
 *   SMTP_HOST  (e.g. smtpout.secureserver.net)
 *   SMTP_PORT  (e.g. 465)
 *   SMTP_USER  (full email address — e.g. recruitment@vizserve.com)
 *   SMTP_PASS  (mailbox password)
 */

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT ?? 465);

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    // Port 465 uses implicit TLS (secure: true).
    // Ports 587/3535 use STARTTLS (secure: false).
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  return cachedTransporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  /** Defaults to plain text. Pass HTML if the body contains markup. */
  contentType?: "Text" | "HTML";
}

export async function sendMail({ to, subject, body, contentType = "Text" }: SendMailInput) {
  const transporter = getTransporter();
  const from = process.env.SMTP_USER!;

  const messageFields =
    contentType === "HTML"
      ? { from, to, subject, html: body }
      : { from, to, subject, text: body };

  // Compose once so SMTP and the IMAP Sent-folder append send the
  // exact same RFC822 bytes (same Message-ID, same headers).
  const raw = await new Promise<Buffer>((resolve, reject) => {
    new MailComposer(messageFields).compile().build((err, msg) => {
      if (err) reject(err);
      else resolve(msg);
    });
  });

  await transporter.sendMail({ envelope: { from, to: [to] }, raw });

  // Best-effort: if the IMAP append fails the recipient still got
  // the email — surface the failure in logs but don't break the send.
  try {
    await appendToSentFolder(raw);
  } catch (err: any) {
    console.error("[sendMail] IMAP Sent-folder append failed:", err.message);
  }
}
