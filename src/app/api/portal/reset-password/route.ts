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

  const clientUser = await prisma.clientUser.findUnique({ where: { resetToken: parsed.data.token } });

  if (!clientUser || !clientUser.resetTokenExpiry || clientUser.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { message: "Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.clientUser.update({
    where: { id: clientUser.id },
    data: { password: newHash, resetToken: null, resetTokenExpiry: null },
  });

  await logAudit({
    userName: clientUser.name,
    action: "UPDATE",
    entityType: "Auth",
    description: `${clientUser.name} berhasil reset password lewat tautan email.`,
  });

  return NextResponse.json({ success: true });
}
