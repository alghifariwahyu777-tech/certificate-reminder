import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { serviceSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } },
      stages: { orderBy: { sequence: "asc" } },
    },
  });

  if (!service) return NextResponse.json({ message: "Layanan tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ service });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    where: { OR: [{ name: parsed.data.name }, { code: parsed.data.code }], NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json(
      { message: "Nama atau kode layanan ini sudah digunakan." },
      { status: 409 }
    );
  }

  const service = await prisma.service.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: service.id,
    description: `Mengubah layanan "${service.name}" (${service.code}).`,
  });

  return NextResponse.json({ service });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service) return NextResponse.json({ message: "Layanan tidak ditemukan." }, { status: 404 });

  await prisma.service.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Service",
    entityId: params.id,
    description: `Menghapus layanan "${service.name}" (${service.code}).`,
  });

  return NextResponse.json({ success: true });
}
