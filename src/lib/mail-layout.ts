import { getTransporter } from "@/lib/email";
import { LOGO_CID, logoPngBuffer } from "@/lib/brand-assets";

export const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function appUrl(path = ""): string {
  return `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

/**
 * Branded wrapper shared by the newer system emails (PIC update request,
 * weekly report): white letterhead with the Sucofindo logo, a navy/teal rule,
 * then the body. The logo is referenced as cid: and attached inline by
 * sendHtmlMail (works in Gmail/Outlook without loading remote images);
 * in-app previews pass `logoSrc` as a data URI instead.
 */
export function brandedEmail(params: { kicker: string; body: string; width?: number; subtitle?: string; logoSrc?: string }): string {
  const width = params.width ?? 640;
  const logo = params.logoSrc ?? `cid:${LOGO_CID}`;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#F4F5F7;font-family:'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background:#ffffff;border:1px solid #DDE3EA;">
<tr><td style="padding:18px 24px 14px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="76" valign="middle"><img src="${logo}" alt="Sucofindo" width="70" height="48" style="display:block;border:0;width:70px;height:48px;"/></td>
<td valign="middle" style="padding-left:12px;">
<div style="font-size:13px;font-weight:bold;color:#123F6B;letter-spacing:0.04em;">PT SUCOFINDO (PERSERO)</div>
<div style="font-size:12px;color:#475569;margin-top:2px;">${esc(params.kicker)}</div></td>
${params.subtitle ? `<td valign="middle" align="right" style="font-size:11px;color:#64748B;line-height:1.5;">${params.subtitle}</td>` : ""}
</tr></table></td></tr>
<tr><td style="height:3px;background:#123F6B;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="height:2px;background:#0EA89B;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:22px 24px;font-size:14px;line-height:1.55;color:#334155;">${params.body}
</td></tr>
<tr><td style="padding:12px 24px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:11px;color:#94A3B8;">Email ini dikirim otomatis oleh Reminder System — PT Sucofindo (Persero). Mohon tidak membalas email ini.</td></tr>
</table></td></tr></table></body></html>`;
}

export function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="background:#123F6B;color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:6px;display:inline-block;font-size:13px;">${esc(label)}</a>`;
}

export async function sendHtmlMail(params: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string; cid?: string }[];
}): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; errorMessage?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { status: "SKIPPED", errorMessage: "GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi — email tidak dikirim (mode simulasi)." };
  }
  const fromName = process.env.EMAIL_FROM_NAME || "Reminder System - PT Sucofindo (Persero)";
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      cc: params.cc || undefined,
      subject: params.subject,
      html: params.html,
      attachments: [
        ...(params.attachments || []),
        // inline logo for brandedEmail()'s letterhead
        ...(params.html.includes(`cid:${LOGO_CID}`) ? [{ filename: "logo-sucofindo.png", content: logoPngBuffer(), cid: LOGO_CID, contentType: "image/png" }] : []),
      ],
    });
    return { status: "SENT" };
  } catch (err) {
    return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Gagal mengirim email." };
  }
}
