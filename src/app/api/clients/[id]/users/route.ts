import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const createClientUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const clientUsers = await prisma.clientUser.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({ clientUsers });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) {
    return NextResponse.json({ message: "Klien tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createClientUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.clientUser.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ message: "Email ini sudah terdaftar sebagai akun portal." }, { status: 409 });
  }

  const clientUser = await prisma.clientUser.create({
    data: {
      clientId: params.id,
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
    },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    description: `Membuat akun Client Portal "${clientUser.name}" (${clientUser.email}) untuk klien "${client.name}".`,
  });

  return NextResponse.json({ clientUser }, { status: 201 });
}
