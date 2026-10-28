import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureDemoDataOnce, fillDemoData, removeDemoData } from "@/lib/demo-data";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { mode: "auto" }: continue filling the demo projects that are still
 * missing (any signed-in user; does nothing once an admin removed the demo
 * data). POST without a mode: an admin fills the demo data on purpose.
 * Both work in steps of ~40 seconds; the response says whether more remain.
 * DELETE: remove the demo data (admin).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body?.mode === "auto") {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const status = await ensureDemoDataOnce();
    if (status.state !== "pending") return NextResponse.json({ done: true, state: status.state });
    try {
      return NextResponse.json(await fillDemoData("Sistem"));
    } catch (e) {
      console.error("demo fill failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ message: `Data contoh gagal dibuat: ${msg.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 200)}` }, { status: 500 });
    }
  }
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const r = await fillDemoData(auth.session.name);
  if (r.created)
    await logAudit({ userId: auth.session.userId, userName: auth.session.name, action: "CREATE", entityType: "ProjectMonitoring", description: `Mengisi ${r.created} project data contoh (DEMO).` });
  return NextResponse.json(r);
}

export async function DELETE() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const n = await removeDemoData();
  await logAudit({ userId: auth.session.userId, userName: auth.session.name, action: "DELETE", entityType: "ProjectMonitoring", description: `Menghapus ${n} project data contoh (DEMO).` });
  return NextResponse.json({ removed: n });
}
