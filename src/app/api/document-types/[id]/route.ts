import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { documentTypeSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = documentTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.documentType.findFirst({
    where: { name: parsed.data.name, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Jenis dokumen dengan nama ini sudah ada." }, { status: 409 });
  }

  const documentType = await prisma.documentType.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: documentType.id,
    description: `Mengubah jenis dokumen menjadi "${documentType.name}".`,
  });

  return NextResponse.json({ documentType });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const usageCount = await prisma.serviceRequirement.count({ where: { documentTypeId: params.id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { message: `Jenis dokumen ini masih dipakai di ${usageCount} persyaratan layanan.` },
      { status: 409 }
    );
  }

  const documentType = await prisma.documentType.findUnique({ where: { id: params.id } });
  await prisma.documentType.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Service",
    entityId: params.id,
    description: `Menghapus jenis dokumen "${documentType?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
