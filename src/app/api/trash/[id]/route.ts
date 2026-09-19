import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deleteFile } from "@/lib/storage";

export const runtime = "nodejs";

/** Permanently deletes a certificate or personnel certification already in Trash — cannot be undone. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });

  if (certificate) {
    if (certificate.driveFileId) {
      await deleteFile(certificate.driveFileId).catch((err) => {
        // Log but don't block deletion on a storage hiccup — an orphaned
        // file is recoverable manually; a stuck Trash entry is worse.
        console.error("Failed to delete file from Supabase Storage:", err);
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

  const personnelCertification = await prisma.personnelCertification.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
    include: { employee: true },
  });

  if (personnelCertification) {
    if (personnelCertification.driveFileId) {
      await deleteFile(personnelCertification.driveFileId).catch((err) => {
        console.error("Failed to delete file from Supabase Storage:", err);
      });
    }

    await prisma.personnelCertification.delete({ where: { id: params.id } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "PERMANENT_DELETE",
      entityType: "PersonnelCertification",
      entityId: personnelCertification.id,
      description: `Menghapus permanen sertifikasi "${personnelCertification.certificationName}" milik ${personnelCertification.employee.name}.`,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: "Data tidak ditemukan di Trash." }, { status: 404 });
}
