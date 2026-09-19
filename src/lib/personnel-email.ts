import { getTransporter } from "@/lib/email";
import { getPersonnelEmailTemplate } from "@/lib/email-template-db";
import {
  substitutePersonnelPlaceholders,
  buildPersonnelSimpleTemplateHtml,
  DEFAULT_PERSONNEL_SIMPLE_FIELDS,
} from "@/lib/personnel-email-template";
import type { SendReminderResult } from "@/lib/email";

export type PersonnelReminderEmailData = {
  employeeName: string;
  position: string | null;
  departmentName: string | null;
  certificationName: string;
  certificationNumber: string | null;
  categoryName: string;
  expiryDate: Date | string;
  daysRemaining: number;
};

/**
 * Sends a personnel certification reminder to the employee (and optionally
 * CC's HR/supervisor), using the admin-editable template from
 * /personnel-email-template — same Simple/Advanced mode pattern as the
 * client certificate reminder, just a separate row in the same table.
 */
export async function sendPersonnelReminderEmail(params: {
  to: string;
  cc?: string | null;
  data: PersonnelReminderEmailData;
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
  const template = await getPersonnelEmailTemplate();
  const subject = substitutePersonnelPlaceholders(template.subject, params.data);
  const html =
    template.mode === "ADVANCED" && template.bodyHtml
      ? substitutePersonnelPlaceholders(template.bodyHtml, params.data)
      : buildPersonnelSimpleTemplateHtml(
          {
            companyName: template.companyName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_PERSONNEL_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.footerText,
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
