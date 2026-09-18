import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runReminderCheck } from "@/lib/reminder";
import { logAudit } from "@/lib/audit";

/**
 * /api/reminders/run — GET and POST both run the same check.
 *
 * Two ways to call this:
 *  1. From the app UI — an authenticated Admin clicks "Kirim Reminder Sekarang"
 *     (sends POST, using their session cookie).
 *  2. From Vercel Cron (see vercel.json) — Vercel always calls the configured
 *     path with GET, and automatically attaches `Authorization: Bearer
 *     <CRON_SECRET>` when CRON_SECRET is set as an environment variable. An
 *     OS-level cron via curl can call either verb the same way, manually
 *     setting that same header.
 */
async function handleReminderRun(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  return handleReminderRun(request);
}

export async function POST(request: NextRequest) {
  return handleReminderRun(request);
}
