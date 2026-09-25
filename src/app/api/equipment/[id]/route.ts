import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { equipmentSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, pic: { include: { department: true } } },
  });
  if (!equipment) return NextResponse.json({ message: "Alat tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ equipment });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const equipment = await prisma.equipment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!equipment) return NextResponse.json({ message: "Alat tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = equipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const updated = await prisma.equipment.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      assetNumber: parsed.data.assetNumber || null,
      serialNumber: parsed.data.serialNumber || null,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      color: parsed.data.color || null,
      categoryId: parsed.data.categoryId,
      picId: parsed.data.picId,
      ccEmail: parsed.data.ccEmail || null,
      condition: parsed.data.condition || null,
      usageStatus: parsed.data.usageStatus || null,
      ownerUnit: parsed.data.ownerUnit || null,
      calibrationNumber: parsed.data.calibrationNumber || null,
      calibratedBy: parsed.data.calibratedBy || null,
      calibrationType: parsed.data.calibrationType || null,
      calibrationInterval: parsed.data.calibrationInterval || null,
      measurementRange: parsed.data.measurementRange || null,
      lastCalibrationDate: parsed.data.lastCalibrationDate ? new Date(parsed.data.lastCalibrationDate) : null,
      nextCalibrationDate: new Date(parsed.data.nextCalibrationDate),
      notes: parsed.data.notes || null,
      ...(parsed.data.fileUrl
        ? {
            fileUrl: parsed.data.fileUrl,
            driveFileId: parsed.data.driveFileId || null,
            fileMimeType: parsed.data.fileMimeType || null,
          }
        : {}),
    },
    include: { category: true, pic: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Equipment",
    entityId: updated.id,
    description: `Mengubah data alat "${updated.name}".`,
  });

  return NextResponse.json({ equipment: updated });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const equipment = await prisma.equipment.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!equipment) return NextResponse.json({ message: "Alat tidak ditemukan." }, { status: 404 });

  await prisma.equipment.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Equipment",
    entityId: equipment.id,
    description: `Memindahkan alat "${equipment.name}" ke Trash.`,
  });

  return NextResponse.json({ success: true });
}
