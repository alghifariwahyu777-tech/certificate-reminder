import { getTransporter } from "@/lib/email";
import { getProjectEmailTemplate } from "@/lib/email-template-db";
import {
  substituteProjectPlaceholders,
  buildProjectSimpleTemplateHtml,
  DEFAULT_PROJECT_SIMPLE_FIELDS,
} from "@/lib/project-email-template";
import type { SendReminderResult } from "@/lib/email";

export type ProjectReminderEmailData = {
  projectNumber: string;
  projectName: string;
  categoryName: string;
  clientName: string;
  pic: string;
  targetEndDate: Date | string;
  daysRemaining: number;
};

/**
 * Sends a project target-completion reminder to the PIC (and optionally
 * CC's supervisor), using the admin-editable template from
 * /project-email-template — same Simple/Advanced mode pattern as the
 * other reminder types.
 */
export async function sendProjectReminderEmail(params: {
  to: string;
  cc?: string | null;
  data: ProjectReminderEmailData;
}): Promise<SendReminderResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      status: "SKIPPED",
      errorMessage: "GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi — email tidak dikirim (mode simulasi).",
    };
  }

  const fromName = process.env.EMAIL_FROM_NAME || "Certificate Reminder - PT Sucofindo (Persero)";
  const from = `"${fromName}" <${process.env.GMAIL_USER}>`;
  const template = await getProjectEmailTemplate();
  const subject = substituteProjectPlaceholders(template.subject, params.data);
  const html =
    template.mode === "ADVANCED" && template.bodyHtml
      ? substituteProjectPlaceholders(template.bodyHtml, params.data)
      : buildProjectSimpleTemplateHtml(
          {
            companyName: template.companyName || DEFAULT_PROJECT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_PROJECT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_PROJECT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_PROJECT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_PROJECT_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_PROJECT_SIMPLE_FIELDS.footerText,
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
    return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Gagal mengirim email." };
  }
}
