import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildWeeklyReport } from "@/lib/weekly-report";
import { generateWeeklyReportPdf } from "@/lib/weekly-report-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const data = await buildWeeklyReport();
  const pdf = await generateWeeklyReportPdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="laporan-mingguan-project-${data.weekKey}.pdf"` },
  });
}
