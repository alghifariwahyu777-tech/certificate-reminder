import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { personnelCertificationSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const certifications = await prisma.personnelCertification.findMany({
    where: { deletedAt: null },
    include: { employee: { include: { department: true } }, category: true },
    orderBy: { expiryDate: "asc" },
  });

  return NextResponse.json({ certifications });
}

export async function POST(request: NextRequest) {
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

  const certification = await prisma.personnelCertification.create({
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
      fileUrl: parsed.data.fileUrl || null,
      driveFileId: parsed.data.driveFileId || null,
      fileMimeType: parsed.data.fileMimeType || null,
    },
    include: { employee: true, category: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "PersonnelCertification",
    entityId: certification.id,
    description: `Menambahkan sertifikasi "${certification.certificationName}" untuk ${certification.employee.name}.`,
  });

  return NextResponse.json({ certification }, { status: 201 });
}
