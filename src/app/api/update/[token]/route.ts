import { NextRequest, NextResponse } from "next/server";
import { picProgressUpdateSchema } from "@/lib/validations";
import { applyProgressUpdate } from "@/lib/pic-update";
import { resolveUpdateToken } from "@/lib/update-token-guard";

/** Progress update submitted through the signed link in the weekly PIC email (no login). */
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const r = await resolveUpdateToken(token);
  if ("error" in r) return NextResponse.json({ message: r.error }, { status: 403 });

  const parsed = picProgressUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  }
  const result = await applyProgressUpdate(r.project.id, parsed.data, { name: r.project.pic, via: "LINK" });
  if ("error" in result) return NextResponse.json({ message: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
