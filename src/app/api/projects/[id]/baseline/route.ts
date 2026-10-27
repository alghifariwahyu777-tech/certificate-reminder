import { NextRequest, NextResponse } from "next/server";
import { guardProjectWrite, auditProjectMonitoring } from "@/lib/project-subresource";
import { lockBaselineIfOpen } from "@/lib/project-cost-import";

/**
 * Locks the project's baseline (current contract value, RAB and target date) as
 * the "rencana awal" for triple-constraint and margin comparisons.
 * { reset: true } re-locks from the current values — for correcting a baseline
 * that was locked too early; it is audited because it rewrites history.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await guardProjectWrite(context);
  if ("error" in g) return g.error;
  const body = await request.json().catch(() => ({}));
  const reset = body?.reset === true;
  const done = await lockBaselineIfOpen(g.project.id, g.session.name, reset);
  if (!done) return NextResponse.json({ message: "Baseline sudah dikunci sebelumnya." }, { status: 400 });
  await auditProjectMonitoring(g.session, g.project, "UPDATE", g.project.id, reset ? "Mengatur ulang baseline dari nilai kontrak, RAB, dan target saat ini" : "Mengunci baseline (rencana awal)");
  return NextResponse.json({ ok: true });
}
