import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { detectFileType } from "@/lib/file-signature";
import { uploadFile, type StorageFolder } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_FOLDERS: StorageFolder[] = ["certificates", "renewals", "applications", "personnel", "misc"];

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const requestedFolder = formData.get("folder") as string | null;
  // Whitelisted, never taken as a raw path — the client only ever picks
  // among these four fixed values, so there's no way to inject an
  // arbitrary storage path from the upload form.
  const folder = ALLOWED_FOLDERS.includes(requestedFolder as StorageFolder)
    ? (requestedFolder as StorageFolder)
    : "misc";

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

  try {
    const { path, fileUrl } = await uploadFile({
      buffer,
      filename: safeName,
      mimeType: detectedType,
      folder,
    });

    return NextResponse.json({ fileUrl, driveFileId: path, fileMimeType: detectedType });
  } catch (err) {
    console.error("Supabase Storage upload failed:", err);
    return NextResponse.json(
      {
        message:
          "Gagal mengunggah dokumen. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah dikonfigurasi dengan benar, dan bucket 'documents' sudah dibuat.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
