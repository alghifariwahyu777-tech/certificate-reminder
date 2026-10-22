import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectProgressPlanSchema } from "@/lib/validations";
import { guardProjectWrite, auditProjectMonitoring } from "@/lib/project-subresource";

/**
 * Replaces the project's whole planned S-curve in one go — the plan is
 * edited as a table, so saving the table is the natural unit of change.
 * Sending an empty `rows` array clears it (the plan then falls back to
 * milestones, then to a straight line).
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await guardProjectWrite(context);
  if ("error" in g) return g.error;

  const body = await request.json().catch(() => null);
  const parsed = projectProgressPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  }

  const rows = [...parsed.data.rows].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].plannedPercent < rows[i - 1].plannedPercent) {
      return NextResponse.json(
        { message: `Rencana kumulatif tidak boleh turun (periode ${rows[i].periodDate}).` },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    prisma.projectProgressPlan.deleteMany({ where: { projectId: g.project.id } }),
    prisma.projectProgressPlan.createMany({
      data: rows.map((r) => ({ projectId: g.project.id, periodDate: new Date(r.periodDate), plannedPercent: r.plannedPercent })),
    }),
  ]);

  await auditProjectMonitoring(
    g.session,
    g.project,
    "UPDATE",
    g.project.id,
    rows.length ? `Memperbarui rencana progres (${rows.length} periode)` : "Menghapus rencana progres manual"
  );
  return NextResponse.json({ ok: true, count: rows.length });
}
