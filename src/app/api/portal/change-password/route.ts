import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { portalChangePasswordSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = portalChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const clientUser = await prisma.clientUser.findUnique({ where: { id: session.clientUserId } });
  if (!clientUser) return NextResponse.json({ message: "Akun tidak ditemukan." }, { status: 404 });

  const valid = await verifyPassword(parsed.data.currentPassword, clientUser.password);
  if (!valid) {
    return NextResponse.json({ message: "Password saat ini salah." }, { status: 401 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.clientUser.update({ where: { id: clientUser.id }, data: { password: newHash } });

  await logAudit({
    userName: `${clientUser.name}`,
    action: "UPDATE",
    entityType: "Auth",
    description: `${clientUser.name} mengubah password akun Client Portal-nya sendiri.`,
  });

  return NextResponse.json({ success: true });
}
