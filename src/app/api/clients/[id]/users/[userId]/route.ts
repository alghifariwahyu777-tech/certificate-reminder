import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateClientUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  isActive: z.boolean(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = updateClientUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const clientUser = await prisma.clientUser.update({
    where: { id: params.userId, clientId: params.id },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      ...(parsed.data.password ? { password: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Client",
    entityId: params.id,
    description: `Mengubah akun Client Portal "${clientUser.name}" (${clientUser.email}).`,
  });

  return NextResponse.json({ clientUser });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const clientUser = await prisma.clientUser.findFirst({ where: { id: params.userId, clientId: params.id } });
  if (!clientUser) {
    return NextResponse.json({ message: "Akun tidak ditemukan." }, { status: 404 });
  }

  await prisma.clientUser.delete({ where: { id: params.userId } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Client",
    entityId: params.id,
    description: `Menghapus akun Client Portal "${clientUser.name}" (${clientUser.email}).`,
  });

  return NextResponse.json({ success: true });
}
