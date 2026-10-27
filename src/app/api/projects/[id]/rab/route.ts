import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guardProjectWrite, auditProjectMonitoring } from "@/lib/project-subresource";
import { RAB_PROJECT_FIELDS, RabFormatError, commitRabImport, parseRabWorkbook, previewRabImport, type RabProjectField } from "@/lib/project-rab-import";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 10 * 1024 * 1024;

/** RAB history of a project (newest first). */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const rows = await prisma.projectRabRevision.findMany({ where: { projectId: id }, orderBy: { version: "desc" } });
  return NextResponse.json({
    revisions: rows.map((r) => ({
      id: r.id,
      version: r.version,
      reason: r.reason,
      fileName: r.fileName,
      contractValue: r.contractValue === null ? null : Number(r.contractValue),
      totalCost: Number(r.totalCost),
      operatingProfit: r.operatingProfit === null ? null : Number(r.operatingProfit),
      marginPct: r.marginPct,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/**
 * POST multipart: file (RAB Sucofindo .xlsx/.xlsm) + commit ("1" to save; otherwise
 * a preview of the key figures). On commit: reason (required for a revision),
 * updateTarget ("1"), apply (comma-separated project fields to overwrite).
 * Stateless: the client sends the same file again to save what it previewed.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await guardProjectWrite(context);
  if ("error" in g) return g.error;
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ message: "File RAB belum dipilih." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ message: "Ukuran file maksimum 10 MB." }, { status: 400 });
  if (!/\.xls[xm]$/i.test(file.name)) return NextResponse.json({ message: "Gunakan file Excel RAB (.xlsx atau .xlsm)." }, { status: 400 });

  try {
    const data = await parseRabWorkbook(Buffer.from(await file.arrayBuffer()));
    if (form.get("commit") !== "1") return NextResponse.json({ preview: await previewRabImport(g.project.id, data, file.name) });

    const apply = String(form.get("apply") || "")
      .split(",")
      .filter((k): k is RabProjectField => (RAB_PROJECT_FIELDS as readonly string[]).includes(k));
    const result = await commitRabImport(
      g.project.id,
      data,
      file.name,
      { reason: (form.get("reason") as string) || null, updateTarget: form.get("updateTarget") === "1", applyFields: apply },
      g.session.name
    );
    await auditProjectMonitoring(
      g.session,
      g.project,
      result.version === 0 ? "CREATE" : "UPDATE",
      g.project.id,
      result.version === 0
        ? `Mengunggah RAB awal "${file.name}" (total RAB Rp ${Math.round(data.operatingCost).toLocaleString("id-ID")}, margin ${data.marginPct ?? "-"}%)`
        : `Mengunggah revisi RAB ke-${result.version} "${file.name}" — ${form.get("reason")}`
    );
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof RabFormatError) return NextResponse.json({ message: e.message }, { status: 400 });
    console.error("RAB import failed", e);
    return NextResponse.json({ message: "File tidak dapat dibaca. Pastikan file adalah RAB Excel (.xlsx/.xlsm) dan tidak dikunci kata sandi." }, { status: 400 });
  }
}
