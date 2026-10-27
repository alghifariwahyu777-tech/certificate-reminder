import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { runWeeklyReport } from "@/lib/weekly-report-send";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Manual send: { target: "self" } sends a test to the admin; "recipients" sends to the configured list now. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  const toSelf = body?.target === "self";
  const result = await runWeeklyReport(null, { force: true, to: toSelf ? [auth.session.email] : undefined });
  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "SEND_REMINDER",
    entityType: "ProjectMonitoring",
    description: `Mengirim laporan mingguan manual ke ${result.recipients.join(", ") || "-"} (${result.status}).`,
  });
  if (result.status === "SENT") return NextResponse.json({ ok: true, recipients: result.recipients });
  return NextResponse.json({ message: result.errorMessage || "Laporan tidak terkirim." }, { status: result.status === "FAILED" ? 502 : 400 });
}
