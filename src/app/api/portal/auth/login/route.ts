import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClientSession } from "@/lib/client-auth";
import { verifyPassword } from "@/lib/auth";
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

  // Shares the rate limiter with internal login but namespaced with a
  // "portal:" prefix, so the two counters never interfere with each other.
  const rateLimit = checkLoginRateLimit(ip, `portal:${email}`);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    return NextResponse.json(
      { message: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const clientUser = await prisma.clientUser.findUnique({
    where: { email },
    include: { client: true },
  });

  if (!clientUser) {
    recordFailedLogin(ip, `portal:${email}`);
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }

  if (!clientUser.isActive) {
    return NextResponse.json(
      { message: "Akun Anda telah dinonaktifkan. Hubungi PT Sucofindo (Persero)." },
      { status: 403 }
    );
  }

  const passwordValid = await verifyPassword(password, clientUser.password);
  if (!passwordValid) {
    recordFailedLogin(ip, `portal:${email}`);
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }

  clearLoginAttempts(ip, `portal:${email}`);

  await createClientSession({
    clientUserId: clientUser.id,
    clientId: clientUser.clientId,
    email: clientUser.email,
    name: clientUser.name,
  });

  await logAudit({
    userName: `${clientUser.name} (${clientUser.client.name})`,
    action: "LOGIN",
    entityType: "Auth",
    description: `${clientUser.name} dari ${clientUser.client.name} login ke Client Portal.`,
  });

  return NextResponse.json({ success: true });
}
