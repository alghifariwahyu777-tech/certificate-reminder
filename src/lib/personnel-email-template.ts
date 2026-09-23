import { formatDate } from "@/lib/utils";
import type { PersonnelReminderEmailData } from "@/lib/personnel-email";

export type { PersonnelReminderEmailData } from "@/lib/personnel-email";

export type PersonnelSimpleTemplateFields = {
  companyName: string;
  systemName: string;
  greeting: string;
  introText: string;
  closingText: string;
  footerText: string;
};

function daysRemainingText(daysRemaining: number): string {
  if (daysRemaining === 0) return "hari ini";
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} hari yang lalu`;
  return `${daysRemaining} hari lagi`;
}

export const PERSONNEL_PLACEHOLDER_TOKENS: { token: string; label: string }[] = [
  { token: "{{employeeName}}", label: "Nama Personil" },
  { token: "{{position}}", label: "Jabatan" },
  { token: "{{departmentName}}", label: "Divisi" },
  { token: "{{certificationName}}", label: "Nama Sertifikasi" },
  { token: "{{certificationNumber}}", label: "Nomor Sertifikasi" },
  { token: "{{categoryName}}", label: "Kategori" },
  { token: "{{expiryDate}}", label: "Tanggal Berakhir" },
  { token: "{{daysRemainingText}}", label: "Sisa Hari (mis. '14 hari lagi')" },
  { token: "{{appUrl}}", label: "URL aplikasi (dari APP_URL di .env)" },
  { token: "{{statusColor}}", label: "Warna sesuai urgensi (merah/oranye/teal) — pakai di style color:" },
];

export const DEFAULT_PERSONNEL_SUBJECT = "[Certificate Reminder] Sertifikasi Personil Akan Berakhir";

export const DEFAULT_PERSONNEL_SIMPLE_FIELDS: PersonnelSimpleTemplateFields = {
  companyName: "PT SUCOFINDO (Persero)",
  systemName: "Personnel Certification Reminder",
  greeting: "Halo {{employeeName}},",
  introText:
    "Ini pengingat bahwa sertifikasi/kompetensi Anda berikut akan segera mencapai atau telah melewati masa berlakunya.",
  closingText:
    "Mohon segera koordinasikan proses perpanjangan dengan atasan/HR Anda supaya kompetensi ini tetap berlaku tanpa jeda.",
  footerText:
    "Email ini dikirim otomatis oleh sistem internal PT Sucofindo (Persero). Mohon tidak membalas email ini — hubungi HR/atasan Anda langsung untuk tindak lanjut.",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokenValues(data: PersonnelReminderEmailData, appUrlOverride?: string): Record<string, string> {
  const appUrl = appUrlOverride || process.env.APP_URL || "http://localhost:3000";
  const isExpired = data.daysRemaining < 0;
  const statusColor = isExpired ? "#DC2626" : data.daysRemaining <= 7 ? "#D97706" : "#0EA89B";
  return {
    employeeName: escapeHtml(data.employeeName),
    position: escapeHtml(data.position || "-"),
    departmentName: escapeHtml(data.departmentName || "-"),
    certificationName: escapeHtml(data.certificationName),
    certificationNumber: escapeHtml(data.certificationNumber || "-"),
    categoryName: escapeHtml(data.categoryName),
    expiryDate: formatDate(data.expiryDate),
    daysRemainingText: daysRemainingText(data.daysRemaining),
    statusColor,
    appUrl,
  };
}

/** Replaces every {{token}} in a template string with its real value. Used by Advanced mode. */
export function substitutePersonnelPlaceholders(
  template: string,
  data: PersonnelReminderEmailData,
  appUrlOverride?: string
): string {
  const values = tokenValues(data, appUrlOverride);
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/**
 * Renders Simple-mode fields into the fixed, pre-styled email layout —
 * same visual language as the client certificate reminder template
 * (dark header with logo, info table, footer), but with personnel-specific
 * fields and no portal link (employees don't have Client Portal accounts).
 */
export function buildPersonnelSimpleTemplateHtml(
  fields: PersonnelSimpleTemplateFields,
  data: PersonnelReminderEmailData,
  appUrlOverride?: string
): string {
  const values = tokenValues(data, appUrlOverride);
  const t = (text: string) =>
    escapeHtml(substitutePersonnelPlaceholders(text, data, appUrlOverride)).replace(/\n/g, "<br/>");
  const companyName = escapeHtml(fields.companyName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.companyName);
  const systemName = escapeHtml(fields.systemName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.systemName);

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Personnel Certification Reminder</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F7F4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0F172A;padding:28px 32px;border-bottom:3px solid #0EA89B;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#ffffff;border-radius:8px;padding:6px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                      <img src="${values.appUrl}/brand/logo-sucofindo-icon.png" width="28" height="28" alt="${companyName}" style="display:block;margin:0 auto;" />
                    </td>
                    <td style="padding-left:12px;">
                      <span style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.02em;">${companyName}</span>
                      <br />
                      <span style="color:#0EA89B;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">${systemName}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;color:#0F172A;font-size:14px;">${t(fields.greeting || DEFAULT_PERSONNEL_SIMPLE_FIELDS.greeting)}</p>
                <p style="margin:0 0 20px 0;color:#334155;font-size:14px;line-height:1.6;">${t(fields.introText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.introText)}</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;width:40%;">Nama Sertifikasi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">${values.certificationName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Nomor Sertifikasi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">${values.certificationNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Kategori</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">${values.categoryName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Personil</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">${values.employeeName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Jabatan / Divisi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">${values.position} · ${values.departmentName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Tanggal Berakhir</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:${values.statusColor};font-size:13px;font-weight:bold;">${values.expiryDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;color:#64748B;font-size:13px;">Sisa Hari</td>
                    <td style="padding:10px 16px;color:${values.statusColor};font-size:13px;font-weight:bold;">${values.daysRemainingText}</td>
                  </tr>
                </table>

                <p style="margin:0 0 8px 0;color:#334155;font-size:14px;line-height:1.6;">${t(fields.closingText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.closingText)}</p>
                <p style="margin:24px 0 0 0;color:#334155;font-size:14px;">Terima kasih.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
                <p style="margin:0;color:#94A3B8;font-size:11px;line-height:1.6;">${t(fields.footerText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.footerText)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Raw HTML source used to seed "Advanced" mode. Tokens here are literal
 * `{{...}}` text — substituted only at actual send/preview time via
 * substitutePersonnelPlaceholders(), never resolved when this constant
 * itself is defined.
 */
export const DEFAULT_PERSONNEL_BODY_HTML = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Personnel Certification Reminder</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F7F4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0F172A;padding:28px 32px;border-bottom:3px solid #0EA89B;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#ffffff;border-radius:8px;padding:6px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                      <img src="{{appUrl}}/brand/logo-sucofindo-icon.png" width="28" height="28" alt="PT Sucofindo (Persero)" style="display:block;margin:0 auto;" />
                    </td>
                    <td style="padding-left:12px;">
                      <span style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.02em;">PT SUCOFINDO (Persero)</span>
                      <br />
                      <span style="color:#0EA89B;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Personnel Certification Reminder</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;color:#0F172A;font-size:14px;">Halo {{employeeName}},</p>
                <p style="margin:0 0 20px 0;color:#334155;font-size:14px;line-height:1.6;">Ini pengingat bahwa sertifikasi/kompetensi Anda berikut akan segera mencapai atau telah melewati masa berlakunya.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;width:40%;">Nama Sertifikasi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">{{certificationName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Nomor Sertifikasi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">{{certificationNumber}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Kategori</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">{{categoryName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Personil</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">{{employeeName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Jabatan / Divisi</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:bold;">{{position}} · {{departmentName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Tanggal Berakhir</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:{{statusColor}};font-size:13px;font-weight:bold;">{{expiryDate}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;color:#64748B;font-size:13px;">Sisa Hari</td>
                    <td style="padding:10px 16px;color:{{statusColor}};font-size:13px;font-weight:bold;">{{daysRemainingText}}</td>
                  </tr>
                </table>

                <p style="margin:0 0 8px 0;color:#334155;font-size:14px;line-height:1.6;">Mohon segera koordinasikan proses perpanjangan dengan atasan/HR Anda supaya kompetensi ini tetap berlaku tanpa jeda.</p>
                <p style="margin:24px 0 0 0;color:#334155;font-size:14px;">Terima kasih.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
                <p style="margin:0;color:#94A3B8;font-size:11px;line-height:1.6;">Email ini dikirim otomatis oleh sistem internal PT Sucofindo (Persero). Mohon tidak membalas email ini — hubungi HR/atasan Anda langsung untuk tindak lanjut.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
