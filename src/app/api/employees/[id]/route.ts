import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { employeeSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  if (parsed.data.employeeId) {
    const duplicate = await prisma.employee.findFirst({
      where: { employeeId: parsed.data.employeeId, NOT: { id: params.id } },
    });
    if (duplicate) {
      return NextResponse.json({ message: "NIP/ID Pegawai ini sudah digunakan." }, { status: 409 });
    }
  }

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      employeeId: parsed.data.employeeId || null,
      position: parsed.data.position || null,
      departmentId: parsed.data.departmentId || null,
      email: parsed.data.email,
      isActive: parsed.data.isActive,
    },
    include: { department: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employee.id,
    description: `Mengubah data personil "${employee.name}".`,
  });

  return NextResponse.json({ employee });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) return NextResponse.json({ message: "Personil tidak ditemukan." }, { status: 404 });

  const certCount = await prisma.personnelCertification.count({ where: { employeeId: params.id } });
  if (certCount > 0) {
    return NextResponse.json(
      { message: `Personil ini masih punya ${certCount} data sertifikasi. Hapus sertifikasinya dulu.` },
      { status: 409 }
    );
  }

  await prisma.employee.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Employee",
    entityId: params.id,
    description: `Menghapus personil "${employee.name}".`,
  });

  return NextResponse.json({ success: true });
}
