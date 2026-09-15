import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deleteFileFromDrive } from "@/lib/google-drive";

export const runtime = "nodejs";

/** Permanently deletes a certificate that is already in Trash — this cannot be undone. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });
  if (!certificate) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan di Trash." }, { status: 404 });
  }

  if (certificate.driveFileId) {
    await deleteFileFromDrive(certificate.driveFileId).catch((err) => {
      // Log but don't block the certificate deletion on a Drive hiccup —
      // an orphaned Drive file is recoverable manually; a stuck Trash entry is worse.
      console.error("Failed to delete file from Google Drive:", err);
    });
  }

  await prisma.certificate.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "PERMANENT_DELETE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Menghapus permanen sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}).`,
  });

  return NextResponse.json({ success: true });
}
