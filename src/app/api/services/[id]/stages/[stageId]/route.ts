import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { workflowStageSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; stageId: string }> }
) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = workflowStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const conflict = await prisma.workflowStage.findFirst({
    where: { serviceId: params.id, sequence: parsed.data.sequence, NOT: { id: params.stageId } },
  });
  if (conflict) {
    return NextResponse.json(
      { message: `Urutan ${parsed.data.sequence} sudah dipakai tahap "${conflict.name}".` },
      { status: 409 }
    );
  }

  const stage = await prisma.workflowStage.update({
    where: { id: params.stageId, serviceId: params.id },
    data: parsed.data,
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: params.id,
    description: `Mengubah tahap workflow "${stage.name}".`,
  });

  return NextResponse.json({ stage });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; stageId: string }> }
) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const stage = await prisma.workflowStage.findFirst({ where: { id: params.stageId, serviceId: params.id } });
  if (!stage) return NextResponse.json({ message: "Tahap tidak ditemukan." }, { status: 404 });

  await prisma.workflowStage.delete({ where: { id: params.stageId } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Service",
    entityId: params.id,
    description: `Menghapus tahap workflow "${stage.name}".`,
  });

  return NextResponse.json({ success: true });
}
