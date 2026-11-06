import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditProject, projectGuard } from "@/lib/project-subresource";
import { activityActualAt, activityShares, dateOnly } from "@/lib/project-monitoring-shared";

/**
 * Save the realisation of several activities for one date ("Perbarui
 * realisasi"). Each activity keeps one value per day; saving the same day
 * again replaces it. The activity status follows the number (0 < x < 100 =
 * berjalan, 100 = selesai on that date), and a progress report marked
 * ACTIVITY is kept for that day so its notes and "last updated" date show in
 * the weekly report. The project percentage itself is always recomputed
 * from the activities, never stored as a typed number.
 */

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  items: z
    .array(z.object({ milestoneId: z.string().min(1), percent: z.number().min(0, "Persentase 0 sampai 100.").max(100, "Persentase 0 sampai 100.") }))
    .min(1, "Isi minimal satu kegiatan."),
  summary: z.string().max(2000).optional().nullable(),
  nextPlan: z.string().max(2000).optional().nullable(),
});

type Ctx = { params: Promise<{ id: string; itemId?: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const g = await projectGuard(context, "project");
  if ("error" in g) return g.error;
  const { session, project } = g;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  const { items, summary, nextPlan } = parsed.data;
  const day = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (day.getTime() > dateOnly(Date.now()) + 24 * 3600 * 1000) return NextResponse.json({ message: "Tanggal tidak boleh di masa depan." }, { status: 400 });

  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId: project.id },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    include: { progressLogs: { select: { date: true, percent: true } } },
  });
  const byId = new Map(milestones.map((m) => [m.id, m]));
  for (const it of items) if (!byId.has(it.milestoneId)) return NextResponse.json({ message: "Kegiatan tidak ditemukan di project ini." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      const m = byId.get(it.milestoneId)!;
      const percent = Math.round(it.percent * 10) / 10;
      await tx.projectMilestoneProgress.upsert({
        where: { milestoneId_date: { milestoneId: m.id, date: day } },
        create: { milestoneId: m.id, projectId: project.id, date: day, percent, createdBy: session.name },
        update: { percent, createdBy: session.name },
      });
      // status follows the number
      const firstLog = [...m.progressLogs.map((l) => l.date.getTime()), day.getTime()].sort((a, b) => a - b)[0];
      const data: Record<string, unknown> = {};
      if (percent >= 100) {
        if (m.status !== "DONE") Object.assign(data, { status: "DONE", actualDate: day });
        if (!m.actualStartDate) data.actualStartDate = new Date(firstLog);
      } else if (percent > 0) {
        if (m.status !== "IN_PROGRESS") Object.assign(data, { status: "IN_PROGRESS", actualDate: null });
        if (!m.actualStartDate) data.actualStartDate = new Date(firstLog);
      } else if (m.status === "DONE") {
        Object.assign(data, { status: "IN_PROGRESS", actualDate: null });
      }
      if (Object.keys(data).length) await tx.projectMilestone.update({ where: { id: m.id }, data });
    }

    // project percentage on that day, from all activities (weights as entered, or equal)
    const fresh = await tx.projectMilestone.findMany({
      where: { projectId: project.id },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      include: { progressLogs: { select: { date: true, percent: true } } },
    });
    const acts = fresh.map((m) => ({
      weight: Number(m.weight),
      plannedDate: m.plannedDate?.getTime() ?? null,
      actualDate: m.actualDate?.getTime() ?? null,
      status: m.status,
      logs: m.progressLogs.map((l) => ({ t: l.date.getTime(), percent: Number(l.percent) })),
    }));
    const shares = activityShares(acts);
    const total = Math.round(acts.reduce((s, a, i) => s + activityActualAt(a, day.getTime()) * shares[i], 0) * 10) / 10;

    const existing = await tx.projectProgressReport.findFirst({ where: { projectId: project.id, reportDate: day, source: "ACTIVITY" } });
    const notes = { summary: summary?.trim() || existing?.summary || null, nextPlan: nextPlan?.trim() || existing?.nextPlan || null };
    if (existing) await tx.projectProgressReport.update({ where: { id: existing.id }, data: { actualPercent: total, ...notes } });
    else await tx.projectProgressReport.create({ data: { projectId: project.id, reportDate: day, actualPercent: total, source: "ACTIVITY", createdBy: session.name, ...notes } });
  });

  await auditProject(session, project, "UPDATE", project.id, `Memperbarui realisasi ${items.length} kegiatan per ${parsed.data.date}`);
  return NextResponse.json({ ok: true });
}
