import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canWriteAnything } from "@/lib/permissions";
import { handleUploadRequest } from "@/lib/upload-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!canWriteAnything(session.role)) return NextResponse.json({ message: "Akun Anda tidak dapat mengunggah file." }, { status: 403 });
  return handleUploadRequest(request);
}
