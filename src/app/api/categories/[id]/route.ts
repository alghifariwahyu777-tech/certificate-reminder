import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.category.findFirst({
    where: { name: parsed.data.name, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Kategori dengan nama ini sudah ada." }, { status: 409 });
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Category",
    entityId: category.id,
    description: `Mengubah kategori menjadi "${category.name}".`,
  });

  return NextResponse.json({ category });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certCount = await prisma.certificate.count({ where: { categoryId: params.id, deletedAt: null } });
  if (certCount > 0) {
    return NextResponse.json(
      { message: `Kategori masih digunakan oleh ${certCount} sertifikat dan tidak dapat dihapus.` },
      { status: 409 }
    );
  }

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  await prisma.category.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Category",
    entityId: params.id,
    description: `Menghapus kategori "${category?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
