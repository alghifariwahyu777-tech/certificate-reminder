import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleUploadRequest } from "@/lib/upload-handler";

export const runtime = "nodejs";

/** Upload for PIC accounts (attachments to their progress updates) — always stored under "projects". */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "PIC" && session.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return handleUploadRequest(request, "projects");
}
