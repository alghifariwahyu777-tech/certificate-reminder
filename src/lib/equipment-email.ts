import { getTransporter } from "@/lib/email";
import { getEquipmentEmailTemplate } from "@/lib/email-template-db";
import {
  substituteEquipmentPlaceholders,
  buildEquipmentSimpleTemplateHtml,
  DEFAULT_EQUIPMENT_SIMPLE_FIELDS,
} from "@/lib/equipment-email-template";
import type { SendReminderResult } from "@/lib/email";

export type EquipmentReminderEmailData = {
  name: string;
  assetNumber: string | null;
  categoryName: string;
  brand: string | null;
  model: string | null;
  picName: string;
  nextCalibrationDate: Date | string;
  daysRemaining: number;
};

/**
 * Sends an equipment calibration reminder to the PIC (and optionally CC's
 * supervisor), using the admin-editable template from
 * /equipment-email-template — same Simple/Advanced mode pattern as the
 * other reminder types.
 */
export async function sendEquipmentReminderEmail(params: {
  to: string;
  cc?: string | null;
  data: EquipmentReminderEmailData;
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
  const template = await getEquipmentEmailTemplate();
  const subject = substituteEquipmentPlaceholders(template.subject, params.data);
  const html =
    template.mode === "ADVANCED" && template.bodyHtml
      ? substituteEquipmentPlaceholders(template.bodyHtml, params.data)
      : buildEquipmentSimpleTemplateHtml(
          {
            companyName: template.companyName || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.footerText,
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
