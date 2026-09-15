import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { certificateSchema } from "@/lib/validations";
import { normalizeCertificatePayload } from "@/lib/certificate-payload";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, client: true, department: true },
  });

  if (!certificate) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ certificate });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const existing = await prisma.certificate.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = certificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const duplicate = await prisma.certificate.findFirst({
    where: { certificateNumber: parsed.data.certificateNumber, NOT: { id: params.id } },
  });
  if (duplicate) {
    const message = duplicate.deletedAt
      ? "Nomor sertifikat ini sudah dipakai oleh sertifikat yang ada di Trash. Pulihkan atau hapus permanen sertifikat itu dulu."
      : "Nomor sertifikat sudah digunakan.";
    return NextResponse.json({ message }, { status: 409 });
  }

  const certificate = await prisma.certificate.update({
    where: { id: params.id },
    data: normalizeCertificatePayload(parsed.data),
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Mengubah sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}).`,
  });

  return NextResponse.json({ certificate });
}

/**
 * Soft delete — marks the row as deleted instead of removing it, so it can
 * be recovered from /trash. The uploaded document is intentionally left on
 * disk until the certificate is permanently deleted from Trash.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!certificate) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan." }, { status: 404 });
  }

  await prisma.certificate.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Memindahkan sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}) ke Trash.`,
  });

  return NextResponse.json({ success: true });
}
