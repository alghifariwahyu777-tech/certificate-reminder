import { getTransporter } from "@/lib/email";
import { formatDate } from "@/lib/utils";
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

function daysRemainingText(days: number): string {
  if (days === 0) return "hari ini";
  if (days < 0) return `${Math.abs(days)} hari yang lalu`;
  return `${days} hari lagi`;
}

/**
 * A separate, fixed template from the client certificate reminder — the
 * tone here is personal/awareness-focused ("sertifikasi Anda"), not the
 * client-facing wording used elsewhere. Not yet exposed through an
 * editable Simple/Advanced UI like the certificate template is; this is a
 * reasonable place to add that later if the wording needs to change often.
 */
function buildPersonnelReminderHtml(data: PersonnelReminderEmailData): string {
  const isExpired = data.daysRemaining < 0;
  const statusColor = isExpired ? "#DC2626" : data.daysRemaining <= 7 ? "#D97706" : "#2563EB";
  const statusLabel = isExpired ? "TELAH KEDALUWARSA" : "AKAN BERAKHIR";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
    <div style="background: #0F172A; padding: 20px 24px; border-radius: 8px 8px 0 0; border-bottom: 3px solid #0EA89B;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color: #ffffff; border-radius: 8px; padding: 6px; width: 36px; height: 36px;">
            <img src="${appUrl}/brand/logo-sucofindo-icon.png" width="24" height="24" alt="PT Sucofindo (Persero)" style="display: block;" />
          </td>
          <td style="padding-left: 12px;">
            <span style="color: #ffffff; font-size: 14px; font-weight: bold;">PT Sucofindo (Persero)</span><br/>
            <span style="color: #0EA89B; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">
              Personnel Certification Reminder
            </span>
          </td>
        </tr>
      </table>
    </div>
    <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
      <p style="margin: 0 0 12px;">Halo ${data.employeeName},</p>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        Ini pengingat bahwa sertifikasi/kompetensi Anda berikut
        <strong style="color: ${statusColor};">${statusLabel}</strong>
        dalam ${daysRemainingText(data.daysRemaining)}:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Sertifikasi</td>
            <td style="padding: 6px 0; font-weight: bold;">${data.certificationName}</td></tr>
        ${data.certificationNumber ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Nomor</td>
            <td style="padding: 6px 0;">${data.certificationNumber}</td></tr>` : ""}
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Kategori</td>
            <td style="padding: 6px 0;">${data.categoryName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Jabatan</td>
            <td style="padding: 6px 0;">${data.position || "-"}${data.departmentName ? ` · ${data.departmentName}` : ""}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Tanggal Berakhir</td>
            <td style="padding: 6px 0; font-weight: bold; color: ${statusColor};">${formatDate(data.expiryDate)}</td></tr>
      </table>
      <p style="margin: 0 0 8px; line-height: 1.6;">
        Mohon segera koordinasikan proses perpanjangan dengan atasan/HR Anda supaya kompetensi ini
        tetap berlaku tanpa jeda.
      </p>
      <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
        Email ini dikirim otomatis oleh sistem internal PT Sucofindo (Persero). Mohon tidak membalas
        email ini — hubungi HR/atasan Anda langsung untuk tindak lanjut.
      </p>
    </div>
  </div>`;
}

/** Sends a personnel certification reminder to the employee (and optionally CC's HR/supervisor). */
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
  const isExpired = params.data.daysRemaining < 0;
  const subject = isExpired
    ? `[Kedaluwarsa] Sertifikasi "${params.data.certificationName}" milik ${params.data.employeeName}`
    : `[Pengingat] Sertifikasi "${params.data.certificationName}" akan berakhir dalam ${params.data.daysRemaining} hari`;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      cc: params.cc || undefined,
      subject,
      html: buildPersonnelReminderHtml(params.data),
    });
    return { status: "SENT" };
  } catch (err) {
    return {
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Gagal mengirim email.",
    };
  }
}
