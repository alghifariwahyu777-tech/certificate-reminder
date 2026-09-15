import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/validations";
import { detectFileType } from "@/lib/file-signature";
import { uploadFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/portal/applications/[id]/documents
 *
 * Uploads a document against one of the application's service requirements.
 * Only allowed while the application is still editable (DRAFT or
 * REVISION_REQUIRED) — once submitted for review, documents are locked
 * until the internal reviewer sends it back for revision.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findFirst({
    where: { id: params.id, clientId: session.clientId },
  });
  if (!application) return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });

  if (!["DRAFT", "REVISION_REQUIRED"].includes(application.status)) {
    return NextResponse.json(
      { message: "Dokumen tidak bisa diunggah saat permohonan sedang dalam status ini." },
      { status: 409 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const serviceRequirementId = formData.get("serviceRequirementId") as string | null;

  if (!file || !serviceRequirementId) {
    return NextResponse.json({ message: "File dan jenis dokumen wajib diisi." }, { status: 400 });
  }

  const requirement = await prisma.serviceRequirement.findFirst({
    where: { id: serviceRequirementId, serviceId: application.serviceId },
  });
  if (!requirement) {
    return NextResponse.json({ message: "Persyaratan dokumen tidak ditemukan untuk layanan ini." }, { status: 404 });
  }

  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json({ message: "Hanya file PDF, JPG, atau PNG yang diterima." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "Ukuran file maksimum 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectFileType(buffer);
  if (!detectedType || !ACCEPTED_FILE_TYPES.includes(detectedType)) {
    return NextResponse.json(
      { message: "Isi file tidak sesuai dengan tipe yang diklaim. Hanya PDF, JPG, atau PNG asli yang diterima." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

  try {
    const { path, fileUrl } = await uploadFile({
      buffer,
      filename: safeName,
      mimeType: detectedType,
      folder: "applications",
    });

    const previous = await prisma.applicationDocument.findFirst({
      where: { applicationId: application.id, serviceRequirementId },
      orderBy: { version: "desc" },
    });

    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: application.id,
        serviceRequirementId,
        version: (previous?.version || 0) + 1,
        fileUrl,
        driveFileId: path,
        fileMimeType: detectedType,
        status: "UPLOADED",
      },
    });

    await logAudit({
      userName: `${session.name}`,
      action: "UPLOAD",
      entityType: "Application",
      entityId: application.id,
      description: `${session.name} mengunggah dokumen untuk permohonan ${application.applicationNumber} (versi ${document.version}).`,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("Supabase Storage upload failed:", err);
    return NextResponse.json(
      { message: "Gagal mengunggah dokumen. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
