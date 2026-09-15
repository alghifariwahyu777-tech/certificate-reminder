import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });
  if (!certificate) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan di Trash." }, { status: 404 });
  }

  await prisma.certificate.update({
    where: { id: params.id },
    data: { deletedAt: null },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "RESTORE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Memulihkan sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}) dari Trash.`,
  });

  return NextResponse.json({ success: true });
}
