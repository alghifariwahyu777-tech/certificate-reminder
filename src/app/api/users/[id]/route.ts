import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  // Prevent an Admin from demoting or deactivating their own account
  // (would otherwise lock every admin out of user management).
  if (params.id === auth.session.userId) {
    if (parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Anda tidak dapat mengubah role akun Anda sendiri." },
        { status: 400 }
      );
    }
    if (!parsed.data.isActive) {
      return NextResponse.json(
        { message: "Anda tidak dapat menonaktifkan akun Anda sendiri." },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      ...(parsed.data.password ? { password: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "User",
    entityId: user.id,
    description: `Mengubah pengguna "${user.name}" (role: ${user.role}, aktif: ${user.isActive}).`,
  });

  return NextResponse.json({ user });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (params.id === auth.session.userId) {
    return NextResponse.json({ message: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
  await prisma.user.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "User",
    entityId: params.id,
    description: `Menghapus pengguna "${targetUser?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
