import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { workflowStageSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service) return NextResponse.json({ message: "Layanan tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = workflowStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.workflowStage.findUnique({
    where: { serviceId_sequence: { serviceId: params.id, sequence: parsed.data.sequence } },
  });
  if (existing) {
    return NextResponse.json(
      { message: `Urutan ${parsed.data.sequence} sudah dipakai tahap "${existing.name}". Gunakan urutan lain.` },
      { status: 409 }
    );
  }

  const stage = await prisma.workflowStage.create({ data: { serviceId: params.id, ...parsed.data } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: service.id,
    description: `Menambahkan tahap workflow "${stage.name}" ke layanan "${service.name}".`,
  });

  return NextResponse.json({ stage }, { status: 201 });
}
