import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { detectFileType } from "@/lib/file-signature";
import { uploadFileToDrive } from "@/lib/google-drive";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 400 });
  }

  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json({ message: "Hanya file PDF, JPG, atau PNG yang diterima." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "Ukuran file maksimum 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Trust the file's actual bytes, not the browser-supplied MIME type —
  // renaming a .exe to .pdf would otherwise sail through the check above.
  const detectedType = detectFileType(buffer);
  if (!detectedType || !ACCEPTED_FILE_TYPES.includes(detectedType)) {
    return NextResponse.json(
      { message: "Isi file tidak sesuai dengan ekstensi/tipe yang diklaim. Hanya PDF, JPG, atau PNG asli yang diterima." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;

  try {
    const { fileId, fileUrl } = await uploadFileToDrive({
      buffer,
      filename: uniqueName,
      mimeType: detectedType,
    });

    return NextResponse.json({ fileUrl, driveFileId: fileId, fileMimeType: detectedType });
  } catch (err) {
    console.error("Google Drive upload failed:", err);
    return NextResponse.json(
      {
        message:
          "Gagal mengunggah ke Google Drive. Pastikan GOOGLE_SERVICE_ACCOUNT_KEY dan GOOGLE_DRIVE_FOLDER_ID sudah dikonfigurasi dengan benar, dan folder sudah di-share ke email service account.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
