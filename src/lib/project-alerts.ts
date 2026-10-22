import { prisma } from "@/lib/prisma";
import { getTransporter } from "@/lib/email";
import type { ReminderRunSummary } from "@/lib/reminder";
import { getMonitoringThresholds, MONITORING_INCLUDE, toMonitoringInput } from "@/lib/project-monitoring";
import { computeMonitoring, formatPercent, formatRupiah, isInvoiceOverdue, shortDate } from "@/lib/project-monitoring-shared";
import { getJakartaToday } from "@/lib/status";

/**
 * Realisasi alerts for ONGOING projects, run as part of the daily reminder
 * job (after the target-date milestones in reminder.ts):
 *
 *  - DEVIATION_CRITICAL — progress is behind plan by ≥ the "kritis" threshold
 *  - PROGRESS_STALE     — no progress update for ≥ N days
 *  - TERM_DUE           — a termin's planned billing date has passed, not yet invoiced
 *  - INVOICE_OVERDUE    — an invoice is past due (or N days old without a due date)
 *
 * Each occurrence is identified by a refKey and logged in ProjectAlertLog
 * (unique per project+type+refKey), so it is emailed once — re-running the
 * job the same day is safe. A *new* occurrence (fresh progress data that is
 * still critical, a moved due date, another stale period) alerts again.
 * All new alerts for one project go out in a single email to the PIC, with
 * the active supervisors CC'd, plus an in-app notification.
 */

type AlertType = "DEVIATION_CRITICAL" | "PROGRESS_STALE" | "TERM_DUE" | "INVOICE_OVERDUE";
type Alert = { type: AlertType; refKey: string; text: string };

const ALERT_TITLE: Record<AlertType, string> = {
  DEVIATION_CRITICAL: "Progres kritis",
  PROGRESS_STALE: "Progres belum diperbarui",
  TERM_DUE: "Termin sudah waktunya ditagih",
  INVOICE_OVERDUE: "Invoice lewat jatuh tempo",
};

export async function runProjectMonitoringAlerts(summary: ReminderRunSummary, supervisorCc: string | undefined): Promise<void> {
  const [projects, thresholds] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null, status: "ONGOING" }, include: MONITORING_INCLUDE }),
    getMonitoringThresholds(),
  ]);
  const today = getJakartaToday().getTime();

  for (const project of projects) {
    const s = computeMonitoring(toMonitoringInput(project), today, thresholds);
    const candidates: Alert[] = [];

    if (today >= (project.startDate?.getTime() ?? 0) && s.plannedPercent - s.actualPercent >= thresholds.deviationCritical && !s.isOverdue) {
      candidates.push({
        type: "DEVIATION_CRITICAL",
        refKey: `dev:${s.lastProgressUpdate ?? "none"}`,
        text: `Progres realisasi ${formatPercent(s.actualPercent)} vs rencana ${formatPercent(s.plannedPercent)} (terlambat ${formatPercent(s.plannedPercent - s.actualPercent)} poin).`,
      });
    }
    if (s.isStale) {
      candidates.push({
        type: "PROGRESS_STALE",
        refKey: `stale:${s.lastProgressUpdate ?? "start"}`,
        text: s.lastProgressUpdate
          ? `Progres terakhir diperbarui ${shortDate(s.lastProgressUpdate)} (${s.daysSinceUpdate} hari lalu). Mohon perbarui laporan progres.`
          : `Belum ada laporan progres sejak project dimulai (${s.daysSinceUpdate} hari).`,
      });
    }
    for (const t of project.terms) {
      if (t.status === "PLANNED" && t.plannedDate && t.plannedDate.getTime() <= today) {
        candidates.push({
          type: "TERM_DUE",
          refKey: `term:${t.id}:${t.plannedDate.toISOString().slice(0, 10)}`,
          text: `${t.name} (${formatRupiah(Number(t.amount))}) direncanakan ditagih ${shortDate(t.plannedDate.getTime())} tetapi belum ditagih.`,
        });
      }
      const inv = { status: t.status, invoiceDate: t.invoiceDate?.getTime() ?? null, dueDate: t.dueDate?.getTime() ?? null };
      if (isInvoiceOverdue(inv, today, thresholds)) {
        candidates.push({
          type: "INVOICE_OVERDUE",
          refKey: `inv:${t.id}:${(t.dueDate ?? t.invoiceDate)?.toISOString().slice(0, 10)}`,
          text: `Invoice ${t.invoiceNumber || t.name} (${formatRupiah(Number(t.amount))}) ${t.dueDate ? `jatuh tempo ${shortDate(t.dueDate.getTime())}` : `diterbitkan ${shortDate(inv.invoiceDate as number)}`} belum dibayar.`,
        });
      }
    }
    if (candidates.length === 0) continue;

    const logged = await prisma.projectAlertLog.findMany({
      where: { projectId: project.id, OR: candidates.map((c) => ({ alertType: c.type, refKey: c.refKey })) },
      select: { alertType: true, refKey: true },
    });
    const done = new Set(logged.map((l) => `${l.alertType}|${l.refKey}`));
    const fresh = candidates.filter((c) => !done.has(`${c.type}|${c.refKey}`));
    if (fresh.length === 0) continue;

    summary.checked += 1;
    const cc = [supervisorCc, project.ccEmail].filter(Boolean).join(", ") || undefined;
    const label = [...new Set(fresh.map((f) => ALERT_TITLE[f.type]))].join(", ");

    let status: "SENT" | "FAILED" | "SKIPPED";
    let errorMessage: string | undefined;
    if (!project.picEmail) {
      status = "SKIPPED";
      errorMessage = "Email PIC belum diisi untuk project ini.";
    } else {
      const result = await sendMonitoringAlertEmail({
        to: project.picEmail,
        cc,
        project: { id: project.id, projectNumber: project.projectNumber, projectName: project.projectName, pic: project.pic },
        alerts: fresh,
      });
      status = result.status;
      errorMessage = result.errorMessage;
    }

    await prisma.projectAlertLog.createMany({
      data: fresh.map((f) => ({
        projectId: project.id,
        alertType: f.type,
        refKey: f.refKey,
        recipient: project.picEmail || "-",
        cc: cc || null,
        status,
        errorMessage: errorMessage || null,
      })),
      skipDuplicates: true,
    });

    // In-app: one notification row per (project, alert type), refreshed to NEW on each new occurrence.
    await Promise.all(
      fresh.map((f) =>
        prisma.notification.upsert({
          where: { projectId_type: { projectId: project.id, type: `PROJECT_${f.type}` } },
          update: { message: `${project.projectName} (${project.projectNumber}): ${f.text}`, status: "NEW" },
          create: {
            projectId: project.id,
            type: `PROJECT_${f.type}`,
            message: `${project.projectName} (${project.projectNumber}): ${f.text}`,
            audience: "INTERNAL",
          },
        })
      )
    );

    if (status === "SENT") summary.sent += 1;
    else if (status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;
    summary.details.push({
      certificateNumber: project.projectNumber,
      certificateName: project.projectName,
      milestoneDays: 0,
      label,
      status,
      errorMessage,
    });
  }
}

async function sendMonitoringAlertEmail(params: {
  to: string;
  cc?: string;
  project: { id: string; projectNumber: string; projectName: string; pic: string };
  alerts: Alert[];
}): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; errorMessage?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { status: "SKIPPED", errorMessage: "GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi — email tidak dikirim (mode simulasi)." };
  }
  const fromName = process.env.EMAIL_FROM_NAME || "Reminder System - PT Sucofindo (Persero)";
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${appUrl}/projects/${params.project.id}#ringkasan`;
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = params.alerts
    .map(
      (a) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;"><strong style="color:#0F172A;">${esc(ALERT_TITLE[a.type])}</strong><br/><span style="color:#475569;">${esc(a.text)}</span></td></tr>`
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#F7F7F4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E2E8F0;border-radius:8px;">
<tr><td style="background:#0F172A;padding:18px 24px;border-radius:8px 8px 0 0;">
<span style="color:#ffffff;font-size:14px;font-weight:bold;">PT Sucofindo (Persero)</span><br/>
<span style="color:#0EA89B;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Reminder System · Monitoring Project</span></td></tr>
<tr><td style="padding:24px;font-size:14px;line-height:1.55;color:#334155;">
<p>Yth. ${esc(params.project.pic)},</p>
<p>Project berikut memerlukan perhatian Anda:</p>
<p style="margin:0 0 4px;font-size:16px;color:#0F172A;"><strong>${esc(params.project.projectName)}</strong></p>
<p style="margin:0 0 12px;font-family:monospace;color:#64748B;">${esc(params.project.projectNumber)}</p>
<table width="100%" cellpadding="0" cellspacing="0">${items}</table>
<p style="margin-top:20px;"><a href="${link}" style="background:#0F172A;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;">Buka Monitoring Project</a></p>
<p style="color:#94A3B8;font-size:12px;margin-top:24px;">Email ini dikirim otomatis oleh Reminder System — PT Sucofindo (Persero). Mohon tidak membalas email ini.</p>
</td></tr></table></td></tr></table></body></html>`;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      cc: params.cc,
      subject: `[Reminder System] Perlu perhatian: ${params.project.projectName}`,
      html,
    });
    return { status: "SENT" };
  } catch (err) {
    return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Gagal mengirim email." };
  }
}
