import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleUploadRequest } from "@/lib/upload-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return handleUploadRequest(request);
}
