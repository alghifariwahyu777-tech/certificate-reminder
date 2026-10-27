import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { runPicUpdateRequests } from "@/lib/pic-update-request";
import type { ReminderRunSummary } from "@/lib/reminder";

export const maxDuration = 60;

/** Sends this week's "please update progress" emails now (still once per PIC per week). */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const summary: ReminderRunSummary = { checked: 0, sent: 0, failed: 0, skipped: 0, details: [] };
  await runPicUpdateRequests(summary, { force: true });
  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "SEND_REMINDER",
    entityType: "ProjectMonitoring",
    description: `Mengirim permintaan update progres ke PIC secara manual: ${summary.sent} terkirim, ${summary.failed} gagal, ${summary.skipped} dilewati.`,
  });
  return NextResponse.json({ summary });
}
