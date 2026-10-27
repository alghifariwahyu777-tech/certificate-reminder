import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { commitCostImport, parseCostWorkbook } from "@/lib/project-cost-import";
import { isSucofindoRab } from "@/lib/project-rab-import";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 10 * 1024 * 1024;

/**
 * POST multipart: file (xlsx), optional projectId (import scoped to one project),
 * commit ("1" to write; otherwise a dry-run preview). Stateless — the client
 * sends the same file again to commit what it previewed.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ message: "File belum dipilih." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ message: "Ukuran file maksimum 10 MB." }, { status: 400 });
  if (!/\.xls[xm]$/i.test(file.name)) return NextResponse.json({ message: "Gunakan file Excel .xlsx." }, { status: 400 });

  let preview;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (await isSucofindoRab(buffer))
      return NextResponse.json(
        { message: 'File ini adalah RAB Sucofindo. Unggah melalui tombol "Unggah RAB" pada tab Keuangan project agar data RAB terbaca lengkap.' },
        { status: 400 }
      );
    preview = await parseCostWorkbook(buffer, { restrictToProjectId: (form.get("projectId") as string) || undefined });
  } catch {
    return NextResponse.json({ message: "File tidak dapat dibaca. Pastikan formatnya .xlsx (bukan .xls/.csv)." }, { status: 400 });
  }

  if (form.get("commit") !== "1") return NextResponse.json({ preview });

  const result = await commitCostImport(preview, auth.session.name);
  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "ProjectMonitoring",
    description: `Import Excel "${file.name}": ${result.costs} baris biaya baru, RAB ${result.budgetProjects} project${result.baselinesLocked ? `, ${result.baselinesLocked} baseline dikunci` : ""}.`,
  });
  return NextResponse.json({ result });
}
