import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createDemoData, removeDemoData } from "@/lib/demo-data";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST: fill the Project module with demo data ("DEMO-…" projects). DELETE: remove it again. Admin only. */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const n = await createDemoData(auth.session.name);
  await logAudit({ userId: auth.session.userId, userName: auth.session.name, action: "CREATE", entityType: "ProjectMonitoring", description: `Mengisi ${n} project data contoh (DEMO).` });
  return NextResponse.json({ created: n });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const n = await removeDemoData();
  await logAudit({ userId: auth.session.userId, userName: auth.session.name, action: "DELETE", entityType: "ProjectMonitoring", description: `Menghapus ${n} project data contoh (DEMO).` });
  return NextResponse.json({ removed: n });
}
