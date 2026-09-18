import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { personnelCertificationSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const certification = await prisma.personnelCertification.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { employee: { include: { department: true } }, category: true },
  });
  if (!certification) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ certification });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = personnelCertificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const certification = await prisma.personnelCertification.update({
    where: { id: params.id },
    data: {
      employeeId: parsed.data.employeeId,
      categoryId: parsed.data.categoryId,
      certificationName: parsed.data.certificationName,
      certificationNumber: parsed.data.certificationNumber || null,
      issuingBody: parsed.data.issuingBody || null,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
      expiryDate: new Date(parsed.data.expiryDate),
      ccEmail: parsed.data.ccEmail || null,
      notes: parsed.data.notes || null,
      ...(parsed.data.fileUrl
        ? {
            fileUrl: parsed.data.fileUrl,
            driveFileId: parsed.data.driveFileId || null,
            fileMimeType: parsed.data.fileMimeType || null,
          }
        : {}),
    },
    include: { employee: true, category: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "PersonnelCertification",
    entityId: certification.id,
    description: `Mengubah sertifikasi "${certification.certificationName}" milik ${certification.employee.name}.`,
  });

  return NextResponse.json({ certification });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certification = await prisma.personnelCertification.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { employee: true },
  });
  if (!certification) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });

  await prisma.personnelCertification.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "PersonnelCertification",
    entityId: params.id,
    description: `Menghapus (ke Trash) sertifikasi "${certification.certificationName}" milik ${certification.employee.name}.`,
  });

  return NextResponse.json({ success: true });
}
