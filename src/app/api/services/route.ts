import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { serviceSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true, stages: true } } },
  });

  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.service.findFirst({
    where: { OR: [{ name: parsed.data.name }, { code: parsed.data.code }] },
  });
  if (duplicate) {
    return NextResponse.json(
      { message: "Nama atau kode layanan ini sudah digunakan." },
      { status: 409 }
    );
  }

  const service = await prisma.service.create({ data: parsed.data });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Service",
    entityId: service.id,
    description: `Menambahkan layanan "${service.name}" (${service.code}).`,
  });

  return NextResponse.json({ service }, { status: 201 });
}
