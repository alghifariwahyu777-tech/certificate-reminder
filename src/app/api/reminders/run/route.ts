import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runReminderCheck } from "@/lib/reminder";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/reminders/run
 *
 * Two ways to call this:
 *  1. From the app UI — an authenticated Admin clicks "Kirim Reminder Sekarang".
 *  2. From an external scheduler (Vercel Cron, OS cron via curl, etc.) — send
 *     header `Authorization: Bearer <CRON_SECRET>` instead of a session cookie.
 *     No cron is wired up to call this automatically yet; see README for how
 *     to schedule it once you're ready to activate real sending.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCronCall = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  let triggeredBy = "Cron/Scheduler";

  if (!isCronCall) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Hanya Administrator yang dapat menjalankan reminder secara manual." },
        { status: 403 }
      );
    }
    triggeredBy = session.name;
  }

  const summary = await runReminderCheck();

  await logAudit({
    userName: triggeredBy,
    action: "SEND_REMINDER",
    entityType: "Reminder",
    description: `Menjalankan pengecekan reminder: ${summary.checked} diperiksa, ${summary.sent} terkirim, ${summary.failed} gagal, ${summary.skipped} dilewati.`,
  });

  return NextResponse.json({ summary });
}
