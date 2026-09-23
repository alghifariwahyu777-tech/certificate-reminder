import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });

  if (certificate) {
    await prisma.certificate.update({ where: { id: params.id }, data: { deletedAt: null } });

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

  const personnelCertification = await prisma.personnelCertification.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
    include: { employee: true },
  });

  if (personnelCertification) {
    await prisma.personnelCertification.update({ where: { id: params.id }, data: { deletedAt: null } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "RESTORE",
      entityType: "PersonnelCertification",
      entityId: personnelCertification.id,
      description: `Memulihkan sertifikasi "${personnelCertification.certificationName}" milik ${personnelCertification.employee.name} dari Trash.`,
    });

    return NextResponse.json({ success: true });
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });

  if (project) {
    await prisma.project.update({ where: { id: params.id }, data: { deletedAt: null } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "RESTORE",
      entityType: "Project",
      entityId: project.id,
      description: `Memulihkan project "${project.projectName}" (${project.projectNumber}) dari Trash.`,
    });

    return NextResponse.json({ success: true });
  }

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.id, deletedAt: { not: null } },
  });

  if (equipment) {
    await prisma.equipment.update({ where: { id: params.id }, data: { deletedAt: null } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "RESTORE",
      entityType: "Equipment",
      entityId: equipment.id,
      description: `Memulihkan alat "${equipment.name}" dari Trash.`,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: "Data tidak ditemukan di Trash." }, { status: 404 });
}
