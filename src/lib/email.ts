import { Resend } from "resend";
import { substitutePlaceholders, buildSimpleTemplateHtml, DEFAULT_SIMPLE_FIELDS, type ReminderEmailData } from "@/lib/email-template";
import { getEmailTemplate } from "@/lib/email-template-db";

export type { ReminderEmailData } from "@/lib/email-template";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
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
  const client = getResendClient();
  if (!client) {
    return {
      status: "SKIPPED",
      errorMessage: "RESEND_API_KEY belum dikonfigurasi — email tidak dikirim (mode simulasi).",
    };
  }

  const from = process.env.EMAIL_FROM || "Certificate Reminder <onboarding@resend.dev>";
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
    const { error } = await client.emails.send({
      from,
      to: params.to,
      cc: params.cc || undefined,
      subject,
      html,
    });

    if (error) {
      return { status: "FAILED", errorMessage: error.message || "Gagal mengirim email." };
    }
    return { status: "SENT" };
  } catch (err) {
    return {
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Gagal mengirim email.",
    };
  }
}
