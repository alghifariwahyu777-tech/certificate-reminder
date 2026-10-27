import { prisma } from "@/lib/prisma";
import type { ReminderRunSummary } from "@/lib/reminder";
import { buildWeeklyReport, renderWeeklyReportEmail } from "@/lib/weekly-report";
import { generateWeeklyReportPdf } from "@/lib/weekly-report-pdf";
import { sendHtmlMail } from "@/lib/mail-layout";
import { isoWeekInfo, isoWeekKey, jakartaWeekday } from "@/lib/week";

export function parseRecipients(raw: string | null | undefined): string[] {
  return [...new Set((raw || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))];
}

/**
 * Sends the weekly management report. Scheduled: only on the configured
 * weekday, only when enabled, once per ISO week (MailingLog). Manual
 * ("Kirim sekarang" in Settings): `force` skips the day/once checks and
 * `to` can redirect it, e.g. to the admin's own address as a test.
 */
export async function runWeeklyReport(
  summary: ReminderRunSummary | null,
  opts: { force?: boolean; to?: string[] } = {}
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED" | "NOT_DUE"; recipients: string[]; errorMessage?: string }> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const recipients = opts.to?.length ? opts.to : parseRecipients(settings?.weeklyReportRecipients);
  const week = isoWeekKey();
  const key = opts.force ? `WEEKLY_REPORT:${week}:manual:${Date.now()}` : `WEEKLY_REPORT:${week}`;

  if (!opts.force) {
    if (!settings?.weeklyReportEnabled || jakartaWeekday() !== settings.weeklyReportDay) return { status: "NOT_DUE", recipients };
    if (await prisma.mailingLog.findUnique({ where: { key } })) return { status: "NOT_DUE", recipients };
  }
  if (recipients.length === 0) {
    return { status: "SKIPPED", recipients, errorMessage: "Daftar penerima laporan mingguan masih kosong (Settings)." };
  }

  const data = await buildWeeklyReport();
  const wk = isoWeekInfo(data.generatedAt);
  const pdf = await generateWeeklyReportPdf(data);
  const result = await sendHtmlMail({
    to: recipients.join(", "),
    subject: `[Reminder System] Laporan Mingguan Monitoring Project, Minggu ke-${wk.week}/${wk.year} (${data.kpi.kritis} kritis, ${data.kpi.waspada} waspada)`,
    html: renderWeeklyReportEmail(data),
    attachments: [{ filename: `laporan-mingguan-project-${data.weekKey}.pdf`, content: pdf, contentType: "application/pdf" }],
  });

  await prisma.mailingLog.create({
    data: { key, kind: "WEEKLY_REPORT", recipients: recipients.join(", "), status: result.status, errorMessage: result.errorMessage || null },
  });

  if (summary) {
    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;
    summary.details.push({
      certificateNumber: data.weekKey,
      certificateName: "Laporan Mingguan Project",
      milestoneDays: 0,
      label: `${recipients.length} penerima`,
      status: result.status,
      errorMessage: result.errorMessage,
    });
  }
  return { ...result, recipients };
}
