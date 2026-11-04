import { NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { generateImportTemplate } from "@/lib/excel-import";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireArea("client");
  if ("error" in auth) return auth.error;

  const buffer = await generateImportTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-sertifikat.xlsx"',
    },
  });
}
