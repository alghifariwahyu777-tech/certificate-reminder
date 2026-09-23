import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { resetToken: parsed.data.token } });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { message: "Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash, resetToken: null, resetTokenExpiry: null },
  });

  await logAudit({
    userName: user.name,
    action: "UPDATE",
    entityType: "Auth",
    description: `${user.name} berhasil reset password akun Admin lewat tautan email.`,
  });

  return NextResponse.json({ success: true });
}
