import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importCertificatesFromExcel } from "@/lib/excel-import";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — spreadsheet, not a document scan

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 400 });
  }

  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ message: "Hanya file Excel (.xlsx) yang diterima." }, { status: 400 });
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return NextResponse.json({ message: "Ukuran file maksimum 5 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const summary = await importCertificatesFromExcel(buffer);

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "Certificate",
      description: `Import Excel: ${summary.created} sertifikat dibuat, ${summary.skipped} dilewati, ${summary.errors} error (dari ${summary.totalRows} baris).`,
    });

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Excel import failed:", err);
    return NextResponse.json(
      {
        message:
          "Gagal membaca file Excel. Pastikan file tidak rusak dan formatnya sesuai template.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
