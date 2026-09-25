import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getReportTable, type ReportType } from "@/lib/reports";
import { generateExcelReport } from "@/lib/excel-report";
import { generatePdfReport } from "@/lib/pdf-report";
import { logAudit } from "@/lib/audit";

// pdfkit and exceljs both need real Node.js filesystem/Buffer APIs — force
// this route off the Edge runtime (Node.js is already the default for route
// handlers, but this makes the requirement explicit and future-proof).
export const runtime = "nodejs";

const VALID_TYPES: ReportType[] = [
  "active",
  "expired",
  "expiring_soon",
  "renewal_history",
  "recap_department",
  "recap_category",
  "application_status",
  "surveillance",
  "sla",
  "monitoring",
  "personnel_certifications",
  "project_status",
  "equipment_calibration",
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ReportType | null;
  const format = searchParams.get("format");

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ message: "Jenis laporan tidak valid." }, { status: 400 });
  }
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ message: "Format harus xlsx atau pdf." }, { status: 400 });
  }

  const table = await getReportTable(type);
  const fileSlug = `${type}-${new Date().toISOString().slice(0, 10)}`;

  await logAudit({
    userId: session.userId,
    userName: session.name,
    action: "CREATE",
    entityType: "Reminder",
    description: `Mengekspor laporan "${table.title}" (${format.toUpperCase()}), ${table.rows.length} baris.`,
  });

  try {
    if (format === "xlsx") {
      const buffer = await generateExcelReport(table);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileSlug}.xlsx"`,
        },
      });
    }

    const pdfBuffer = await generatePdfReport(table);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileSlug}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`Report export failed (type=${type}, format=${format}):`, err);
    return NextResponse.json(
      {
        message:
          format === "pdf"
            ? "Gagal membuat file PDF. Pastikan dependency 'pdfkit' terinstall dengan benar dan server berjalan di Node.js runtime (bukan Edge)."
            : "Gagal membuat file Excel.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
