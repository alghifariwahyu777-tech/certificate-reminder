import nodemailer from "nodemailer";
import { substitutePlaceholders, buildSimpleTemplateHtml, DEFAULT_SIMPLE_FIELDS, type ReminderEmailData } from "@/lib/email-template";
import { getEmailTemplate } from "@/lib/email-template-db";

export type { ReminderEmailData } from "@/lib/email-template";

/**
 * Sends through Gmail's own SMTP server, authenticated as a real Gmail
 * mailbox via an App Password (Google removed plain-password "less secure
 * app" access, so a 16-character App Password — generated with 2-Step
 * Verification enabled — is required instead of the account password).
 *
 * Unlike a third-party relay (Resend, SendGrid, etc.), this needs no
 * domain-ownership verification: Google already knows GMAIL_USER is a real
 * mailbox you're authenticated into, so it can be used as the From address
 * immediately, to any recipient. Trade-off: ~500 recipients/day on a free
 * Gmail account (2,000/day on Google Workspace), and the sender always
 * shows as that Gmail address, not a company domain.
 */
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export type SendReminderResult =
  | { status: "SENT" }
  | { status: "FAILED"; errorMessage: string }
  | { status: "SKIPPED"; errorMessage: string };

/**
 * Sends a single reminder email using the current (editable) template.
 * Returns a result object rather than throwing, so the caller can log the
 * outcome to EmailLog either way.
 */
export async function sendReminderEmail(params: {
  to: string;
  cc?: string | null;
  data: ReminderEmailData;
}): Promise<SendReminderResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      status: "SKIPPED",
      errorMessage: "GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi — email tidak dikirim (mode simulasi).",
    };
  }

  // Gmail SMTP always sends as the authenticated mailbox — only the
  // display name in front of it can be customized, not the address itself.
  const fromName = process.env.EMAIL_FROM_NAME || "Certificate Reminder - PT Sucofindo (Persero)";
  const from = `"${fromName}" <${process.env.GMAIL_USER}>`;
  const template = await getEmailTemplate();
  const subject = substitutePlaceholders(template.subject, params.data);
  const html =
    template.mode === "ADVANCED" && template.bodyHtml
      ? substitutePlaceholders(template.bodyHtml, params.data)
      : buildSimpleTemplateHtml(
          {
            companyName: template.companyName || DEFAULT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_SIMPLE_FIELDS.closingText,
            buttonText: template.buttonText || DEFAULT_SIMPLE_FIELDS.buttonText,
            footerText: template.footerText || DEFAULT_SIMPLE_FIELDS.footerText,
          },
          params.data
        );

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      cc: params.cc || undefined,
      subject,
      html,
    });
    return { status: "SENT" };
  } catch (err) {
    return {
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Gagal mengirim email.",
    };
  }
}
