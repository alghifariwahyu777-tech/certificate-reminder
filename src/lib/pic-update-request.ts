import { prisma } from "@/lib/prisma";
import type { ReminderRunSummary } from "@/lib/reminder";
import { getProjectWithMonitoring } from "@/lib/project-monitoring";
import { formatPercent, shortDate } from "@/lib/project-monitoring-shared";
import { createUpdateToken, updateLink } from "@/lib/update-token";
import { appUrl, brandedEmail, button, esc, sendHtmlMail } from "@/lib/mail-layout";
import { isoWeekInfo, isoWeekKey, jakartaWeekday } from "@/lib/week";

/**
 * Weekly "please update your progress" email. One email per PIC address,
 * listing all of that PIC's running projects (SDB: one person often holds
 * several), each with its own signed no-login link. Runs from the daily job
 * on the configured weekday; MailingLog keeps it to once per PIC per week.
 */
export async function runPicUpdateRequests(summary: ReminderRunSummary, opts: { force?: boolean } = {}): Promise<void> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const enabled = settings?.picUpdateRequestEnabled ?? true;
  const day = settings?.picUpdateRequestDay ?? 1;
  if (!opts.force && (!enabled || jakartaWeekday() !== day)) return;

  const week = isoWeekKey();
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "ONGOING", picEmail: { not: null } },
    select: { id: true, picEmail: true, pic: true },
  });
  const byEmail = new Map<string, { pic: string; ids: string[] }>();
  for (const p of projects) {
    const email = (p.picEmail || "").trim().toLowerCase();
    if (!email) continue;
    const entry = byEmail.get(email) || { pic: p.pic, ids: [] };
    entry.ids.push(p.id);
    byEmail.set(email, entry);
  }

  const picUsers = new Set(
    (await prisma.user.findMany({ where: { role: "PIC", isActive: true }, select: { email: true } })).map((u) => u.email.toLowerCase())
  );

  for (const [email, { pic, ids }] of byEmail) {
    const key = `PIC_UPDATE:${week}:${email}`;
    if (await prisma.mailingLog.findUnique({ where: { key } })) continue;

    const rows: string[] = [];
    for (const id of ids) {
      const loaded = await getProjectWithMonitoring(id);
      if (!loaded) continue;
      const { project, summary: s } = loaded;
      const link = updateLink(await createUpdateToken(project.id, project.picEmail));
      rows.push(`<tr><td style="padding:12px 0;border-bottom:1px solid #E2E8F0;">
<strong style="color:#0F172A;">${esc(project.projectName)}</strong><br/>
<span style="color:#64748B;font-size:12px;">${esc(project.projectNumber)}, target selesai ${shortDate(project.targetEndDate.getTime())}, progres tercatat ${formatPercent(s.actualPercent)} (rencana ${formatPercent(s.plannedPercent)})${
        s.lastProgressUpdate ? `, pembaruan terakhir ${shortDate(s.lastProgressUpdate)}` : ", belum pernah diperbarui"
      }</span><br/><div style="margin-top:8px;">${button(link, "Perbarui Progres")}</div></td></tr>`);
    }
    if (rows.length === 0) continue;

    const body = `<p>Yth. ${esc(pic)},</p>
<p>Mohon kesediaan Bapak/Ibu untuk memperbarui progres project berikut untuk minggu ini (±2 menit per project). Silakan klik tombol <strong>Perbarui Progres</strong> pada setiap project; tidak diperlukan login.</p>
<table width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>
${picUsers.has(email) ? `<p style="margin-top:16px;font-size:13px;">Pembaruan juga dapat dilakukan dengan login melalui <a href="${esc(appUrl("/pic"))}">${esc(appUrl("/pic"))}</a>.</p>` : ""}
<p style="font-size:12px;color:#64748B;">Tautan berlaku selama 21 hari dan hanya untuk project yang tercantum pada email ini. Terima kasih atas kerja samanya.</p>`;

    const result = await sendHtmlMail({
      to: email,
      subject: `[Reminder System] Permohonan Pembaruan Progres Project, Minggu ke-${isoWeekInfo().week}/${isoWeekInfo().year} (${rows.length} project)`,
      html: brandedEmail({ kicker: "Permohonan Pembaruan Progres Mingguan", body }),
    });
    await prisma.mailingLog.create({
      data: { key, kind: "PIC_UPDATE", recipients: email, status: result.status, errorMessage: result.errorMessage || null },
    });

    if (result.status === "SENT") summary.sent += 1;
    else if (result.status === "FAILED") summary.failed += 1;
    else summary.skipped += 1;
    summary.details.push({
      certificateNumber: email,
      certificateName: `Permohonan pembaruan progres, ${pic}`,
      milestoneDays: 0,
      label: `${rows.length} project`,
      status: result.status,
      errorMessage: result.errorMessage,
    });
  }
}
