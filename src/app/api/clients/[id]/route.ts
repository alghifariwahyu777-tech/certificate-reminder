import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { clientSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { certificates: { include: { category: true } } },
  });

  if (!client) return NextResponse.json({ message: "Klien tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
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

  const duplicate = await prisma.client.findFirst({
    where: { name: parsed.data.name, NOT: { id: params.id } },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Klien dengan nama ini sudah terdaftar." }, { status: 409 });
  }

  const client = await prisma.client.update({
    where: { id: params.id },
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
    action: "UPDATE",
    entityType: "Client",
    entityId: client.id,
    description: `Mengubah data klien "${client.name}".`,
  });

  return NextResponse.json({ client });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certCount = await prisma.certificate.count({ where: { clientId: params.id, deletedAt: null } });
  if (certCount > 0) {
    return NextResponse.json(
      { message: `Klien masih memiliki ${certCount} sertifikat dan tidak dapat dihapus.` },
      { status: 409 }
    );
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  await prisma.client.delete({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Client",
    entityId: params.id,
    description: `Menghapus klien "${client?.name || params.id}".`,
  });

  return NextResponse.json({ success: true });
}
