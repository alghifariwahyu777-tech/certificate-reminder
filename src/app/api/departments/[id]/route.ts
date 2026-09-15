import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { departmentSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.department.findFirst({
    where: { name: parsed.data.name, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Divisi dengan nama ini sudah ada." }, { status: 409 });
  }

  const department = await prisma.department.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Department",
    entityId: department.id,
    description: `Mengubah divisi menjadi "${department.name}".`,
  });

  return NextResponse.json({ department });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certCount = await prisma.certificate.count({ where: { departmentId: params.id, deletedAt: null } });
  if (certCount > 0) {
    return NextResponse.json(
      { message: `Divisi masih digunakan oleh ${certCount} sertifikat dan tidak dapat dihapus.` },
      { status: 409 }
    );
  }

  const department = await prisma.department.findUnique({ where: { id: params.id } });
  await prisma.department.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Department",
    entityId: params.id,
    description: `Menghapus divisi "${department?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
