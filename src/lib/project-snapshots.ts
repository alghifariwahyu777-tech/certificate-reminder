import { prisma } from "@/lib/prisma";
import { getMonitoringThresholds, MONITORING_INCLUDE, toMonitoringInput } from "@/lib/project-monitoring";
import { computeMonitoring } from "@/lib/project-monitoring-shared";
import { analyzeMargin } from "@/lib/project-margin";
import { getJakartaToday } from "@/lib/status";
import { isoWeekKey } from "@/lib/week";

/**
 * Upserts this week's snapshot for every running project. Called by the
 * daily job, so each week's row ends up holding that week's last values —
 * the history behind trend arrows (▲▼) and the weekly charts. Safe to run
 * any number of times.
 */
export async function takeWeeklySnapshots(): Promise<number> {
  const [projects, thresholds] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null, status: "ONGOING" }, include: MONITORING_INCLUDE }),
    getMonitoringThresholds(),
  ]);
  const todayDate = getJakartaToday();
  const today = todayDate.getTime();
  const weekKey = isoWeekKey();

  for (const p of projects) {
    const input = toMonitoringInput(p);
    const s = computeMonitoring(input, today, thresholds);
    const m = analyzeMargin(input, s, today, thresholds.marginDropAlert);
    const data = {
      snapshotDate: todayDate,
      plannedPercent: s.plannedPercent,
      actualPercent: s.actualPercent,
      deviation: s.deviation,
      spi: s.spi,
      health: s.health,
      invoiced: s.invoiced,
      paid: s.paid,
      pad: s.pad,
      costActual: s.costActual,
      openIssues: s.openIssues,
      cpi: m.cpi,
      actualMarginPct: m.actualMarginPct,
      forecastMarginPct: m.hasCost ? m.forecastMarginPct : null,
      plannedMarginPct: m.plannedMarginPct,
    };
    await prisma.projectSnapshot.upsert({
      where: { projectId_weekKey: { projectId: p.id, weekKey } },
      update: data,
      create: { projectId: p.id, weekKey, ...data },
    });
  }
  return projects.length;
}
