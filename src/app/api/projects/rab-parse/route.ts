import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RabFormatError, parseRabWorkbook } from "@/lib/project-rab-import";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Reads a RAB without saving anything — used to pre-fill the new-project form. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ message: "File RAB belum dipilih." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ message: "Ukuran file maksimum 10 MB." }, { status: 400 });
  try {
    const data = await parseRabWorkbook(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof RabFormatError) return NextResponse.json({ message: e.message }, { status: 400 });
    return NextResponse.json({ message: "File tidak dapat dibaca. Pastikan file adalah RAB Excel (.xlsx/.xlsm)." }, { status: 400 });
  }
}
