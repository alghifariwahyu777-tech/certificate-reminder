import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { clientSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.client.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ message: "Klien dengan nama ini sudah terdaftar." }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      contactPerson: parsed.data.contactPerson || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    description: `Menambahkan klien "${client.name}".`,
  });

  return NextResponse.json({ client }, { status: 201 });
}
