import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { personnelCategorySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = personnelCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.personnelCertificationCategory.findFirst({
    where: { name: parsed.data.name, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Kategori dengan nama ini sudah ada." }, { status: 409 });
  }

  const category = await prisma.personnelCertificationCategory.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "PersonnelCertification",
    entityId: category.id,
    description: `Mengubah kategori sertifikasi personil menjadi "${category.name}".`,
  });

  return NextResponse.json({ category });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const usageCount = await prisma.personnelCertification.count({ where: { categoryId: params.id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { message: `Kategori ini masih dipakai di ${usageCount} data sertifikasi.` },
      { status: 409 }
    );
  }

  const category = await prisma.personnelCertificationCategory.findUnique({ where: { id: params.id } });
  await prisma.personnelCertificationCategory.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "PersonnelCertification",
    entityId: params.id,
    description: `Menghapus kategori sertifikasi personil "${category?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
