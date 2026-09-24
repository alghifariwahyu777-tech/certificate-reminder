import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { supervisorSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = supervisorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.supervisor.findFirst({
    where: { email: parsed.data.email, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Email atasan ini sudah dipakai." }, { status: 409 });
  }

  const supervisor = await prisma.supervisor.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      position: parsed.data.position || null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Supervisor",
    entityId: supervisor.id,
    description: `Mengubah data atasan "${supervisor.name}" (${supervisor.email}).`,
  });

  return NextResponse.json({ supervisor });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supervisor = await prisma.supervisor.findUnique({ where: { id: params.id } });
  if (!supervisor) return NextResponse.json({ message: "Atasan tidak ditemukan." }, { status: 404 });

  await prisma.supervisor.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Supervisor",
    entityId: params.id,
    description: `Menghapus atasan "${supervisor.name}" (${supervisor.email}) dari direktori Supervisor.`,
  });

  return NextResponse.json({ success: true });
}
