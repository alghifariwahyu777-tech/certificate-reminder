import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword, type Role } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(request);

  const rateLimit = checkLoginRateLimit(ip, email);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        message: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.`,
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    recordFailedLogin(ip, email);
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json(
      { message: "Akun Anda telah dinonaktifkan. Hubungi Administrator." },
      { status: 403 }
    );
  }

  const passwordValid = await verifyPassword(password, user.password);
  if (!passwordValid) {
    recordFailedLogin(ip, email);
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }

  clearLoginAttempts(ip, email);

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "LOGIN",
    entityType: "Auth",
    description: `${user.name} (${user.role}) berhasil login.`,
  });

  return NextResponse.json({ success: true });
}
