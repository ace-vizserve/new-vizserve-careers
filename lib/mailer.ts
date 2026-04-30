import nodemailer from "nodemailer";

/**
 * SMTP mailer for the recruiting inbox.
 *
 * Connects to GoDaddy Professional Email's SMTP server and sends
 * mail as the configured mailbox. The mailbox owner stays in
 * GoDaddy — we just borrow its outgoing server.
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

  const message =
    contentType === "HTML"
      ? { from, to, subject, html: body }
      : { from, to, subject, text: body };

  await transporter.sendMail(message);
}
