import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateImportTemplate } from "@/lib/excel-import";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const buffer = await generateImportTemplate();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-sertifikat.xlsx"',
    },
  });
}
