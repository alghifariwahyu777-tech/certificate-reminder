import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateProjectReportPdf } from "@/lib/project-report-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Detailed PDF report of one project (any signed-in internal user). */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const out = await generateProjectReportPdf(id);
  if (!out) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });
  return new NextResponse(new Uint8Array(out.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${out.fileName}"` },
  });
}
