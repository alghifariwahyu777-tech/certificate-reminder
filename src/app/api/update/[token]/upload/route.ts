import { NextRequest, NextResponse } from "next/server";
import { handleUploadRequest } from "@/lib/upload-handler";
import { resolveUpdateToken } from "@/lib/update-token-guard";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const r = await resolveUpdateToken(token);
  if ("error" in r) return NextResponse.json({ message: r.error }, { status: 403 });
  return handleUploadRequest(request, "projects");
}
