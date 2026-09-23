import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { equipmentSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    include: { category: true, pic: { include: { department: true } } },
    orderBy: { nextCalibrationDate: "asc" },
  });

  return NextResponse.json({ equipment });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = equipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const equipment = await prisma.equipment.create({
    data: {
      name: parsed.data.name,
      assetNumber: parsed.data.assetNumber || null,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      color: parsed.data.color || null,
      categoryId: parsed.data.categoryId,
      picId: parsed.data.picId,
      ccEmail: parsed.data.ccEmail || null,
      calibrationNumber: parsed.data.calibrationNumber || null,
      calibratedBy: parsed.data.calibratedBy || null,
      lastCalibrationDate: parsed.data.lastCalibrationDate ? new Date(parsed.data.lastCalibrationDate) : null,
      nextCalibrationDate: new Date(parsed.data.nextCalibrationDate),
      notes: parsed.data.notes || null,
      fileUrl: parsed.data.fileUrl || null,
      driveFileId: parsed.data.driveFileId || null,
      fileMimeType: parsed.data.fileMimeType || null,
    },
    include: { category: true, pic: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Equipment",
    entityId: equipment.id,
    description: `Menambahkan alat "${equipment.name}" (PIC: ${equipment.pic.name}).`,
  });

  return NextResponse.json({ equipment }, { status: 201 });
}
