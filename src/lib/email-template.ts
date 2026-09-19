import { formatDate } from "@/lib/utils";

export type ReminderEmailData = {
  certificateName: string;
  certificateNumber: string;
  categoryName: string;
  clientName: string;
  pic: string;
  expiryDate: Date | string;
  daysRemaining: number;
};

export type SimpleTemplateFields = {
  companyName: string;
  systemName: string;
  greeting: string;
  introText: string;
  closingText: string;
  buttonText: string;
  footerText: string;
};

export const PLACEHOLDER_TOKENS: { token: string; label: string }[] = [
  { token: "{{certificateName}}", label: "Nama Sertifikat" },
  { token: "{{certificateNumber}}", label: "Nomor Sertifikat" },
  { token: "{{categoryName}}", label: "Kategori" },
  { token: "{{clientName}}", label: "Klien" },
  { token: "{{pic}}", label: "PIC" },
  { token: "{{expiryDate}}", label: "Tanggal Berakhir" },
  { token: "{{daysRemainingText}}", label: "Sisa Hari (mis. '14 hari lagi')" },
  { token: "{{appUrl}}", label: "URL aplikasi (dari APP_URL di .env)" },
];

export const DEFAULT_SUBJECT = "[Certificate Reminder] Sertifikat Akan Berakhir";

export const DEFAULT_SIMPLE_FIELDS: SimpleTemplateFields = {
  companyName: "PT SUCOFINDO (Persero)",
  systemName: "Certificate Reminder System",
  greeting: "Halo,",
  introText:
    "Sertifikat berikut akan segera mencapai atau telah melewati masa berlakunya. Mohon segera ditindaklanjuti.",
  closingText: "Mohon segera melakukan proses perpanjangan sertifikat sebelum masa berlaku berakhir.",
  buttonText: "Lihat Detail di Certificate Reminder System",
  footerText:
    "Email ini dikirim otomatis oleh Certificate Reminder System — PT Sucofindo (Persero). Mohon tidak membalas email ini. Untuk pertanyaan, hubungi administrator sistem internal Anda.",
};

export const DEFAULT_BODY_HTML = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Certificate Reminder</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F7F4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F7F4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#0F172A;padding:24px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:0.02em;">PT SUCOFINDO (Persero)</span>
                <br />
                <span style="color:#94A3B8;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Certificate Reminder System</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;color:#0F172A;font-size:14px;">Halo,</p>
                <p style="margin:0 0 20px 0;color:#334155;font-size:14px;line-height:1.6;">
                  Sertifikat berikut akan segera mencapai atau telah melewati masa berlakunya. Mohon segera ditindaklanjuti.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;width:40%;">Nama Sertifikat</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{certificateName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Nomor Sertifikat</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{certificateNumber}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Kategori</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{categoryName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Klien</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{clientName}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">PIC</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{pic}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Tanggal Berakhir</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">{{expiryDate}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;color:#64748B;font-size:12px;">Sisa Hari</td>
                    <td style="padding:10px 16px;color:#0F172A;font-size:12px;font-weight:bold;">{{daysRemainingText}}</td>
                  </tr>
                </table>
                <p style="margin:0 0 24px 0;color:#334155;font-size:14px;line-height:1.6;">
                  Mohon segera melakukan proses perpanjangan sertifikat sebelum masa berlaku berakhir.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px;background-color:#0F172A;">
                      <a href="{{appUrl}}/certificate" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;">
                        Lihat Detail di Certificate Reminder System
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;color:#334155;font-size:14px;">Terima kasih.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
                <p style="margin:0;color:#94A3B8;font-size:11px;line-height:1.6;">
                  Email ini dikirim otomatis oleh Certificate Reminder System — PT Sucofindo (Persero).
                  Mohon tidak membalas email ini. Untuk pertanyaan, hubungi administrator sistem internal Anda.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function daysRemainingText(daysRemaining: number): string {
  if (daysRemaining < 0) return `Terlambat ${Math.abs(daysRemaining)} hari`;
  if (daysRemaining === 0) return "Berakhir hari ini";
  return `${daysRemaining} hari lagi`;
}

function tokenValues(data: ReminderEmailData): Record<string, string> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return {
    certificateName: escapeHtml(data.certificateName),
    certificateNumber: escapeHtml(data.certificateNumber),
    categoryName: escapeHtml(data.categoryName),
    clientName: escapeHtml(data.clientName),
    pic: escapeHtml(data.pic),
    expiryDate: formatDate(data.expiryDate),
    daysRemainingText: daysRemainingText(data.daysRemaining),
    appUrl,
  };
}

/** Replaces every {{token}} in a template string with its real value. Used by Advanced mode. */
export function substitutePlaceholders(template: string, data: ReminderEmailData): string {
  const values = tokenValues(data);
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/**
 * Renders Simple-mode fields into the fixed, pre-styled email layout. Free
 * text fields may themselves contain {{tokens}} (e.g. "Halo tim
 * {{clientName}},") — those get substituted too, so the simple editor stays
 * flexible without ever showing the admin raw HTML.
 */
export function buildSimpleTemplateHtml(fields: SimpleTemplateFields, data: ReminderEmailData): string {
  const values = tokenValues(data);
  const t = (text: string) => escapeHtml(substitutePlaceholders(text, data)).replace(/\n/g, "<br/>");
  const companyName = escapeHtml(fields.companyName || DEFAULT_SIMPLE_FIELDS.companyName);
  const systemName = escapeHtml(fields.systemName || DEFAULT_SIMPLE_FIELDS.systemName);

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${systemName}</title>
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
                    <td style="background-color:#ffffff;border-radius:8px;padding:6px;width:40px;height:40px;">
                      <img src="${values.appUrl}/brand/logo-sucofindo-icon.png" width="28" height="28" alt="${companyName}" style="display:block;" />
                    </td>
                    <td style="padding-left:12px;">
                      <span style="color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:0.02em;">${companyName}</span>
                      <br />
                      <span style="color:#0EA89B;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">${systemName}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;color:#0F172A;font-size:14px;">${t(fields.greeting || DEFAULT_SIMPLE_FIELDS.greeting)}</p>
                <p style="margin:0 0 20px 0;color:#334155;font-size:14px;line-height:1.6;">${t(fields.introText || DEFAULT_SIMPLE_FIELDS.introText)}</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;width:40%;">Nama Sertifikat</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.certificateName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Nomor Sertifikat</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.certificateNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Kategori</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.categoryName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Klien</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">PIC</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.pic}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:12px;">Tanggal Berakhir</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:12px;font-weight:bold;">${values.expiryDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;color:#64748B;font-size:12px;">Sisa Hari</td>
                    <td style="padding:10px 16px;color:#0F172A;font-size:12px;font-weight:bold;">${values.daysRemainingText}</td>
                  </tr>
                </table>

                <p style="margin:0 0 24px 0;color:#334155;font-size:14px;line-height:1.6;">${t(fields.closingText || DEFAULT_SIMPLE_FIELDS.closingText)}</p>

                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px;background-color:#0EA89B;">
                      <a href="${values.appUrl}/portal" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;">
                        ${escapeHtml(fields.buttonText || DEFAULT_SIMPLE_FIELDS.buttonText)}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0 0;color:#334155;font-size:14px;">Terima kasih.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
                <p style="margin:0;color:#94A3B8;font-size:11px;line-height:1.6;">${t(fields.footerText || DEFAULT_SIMPLE_FIELDS.footerText)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
