import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: { category: true, _count: { select: { addenda: true } } },
    orderBy: { targetEndDate: "asc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.project.findUnique({ where: { projectNumber: parsed.data.projectNumber } });
  if (existing) {
    return NextResponse.json({ message: "Nomor project ini sudah terdaftar." }, { status: 409 });
  }

  const project = await prisma.project.create({
    data: {
      projectNumber: parsed.data.projectNumber,
      projectName: parsed.data.projectName,
      categoryId: parsed.data.categoryId,
      clientName: parsed.data.clientName,
      pic: parsed.data.pic,
      picEmail: parsed.data.picEmail || null,
      ccEmail: parsed.data.ccEmail || null,
      contractValue: parsed.data.contractValue || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      targetEndDate: new Date(parsed.data.targetEndDate),
      actualEndDate: parsed.data.actualEndDate ? new Date(parsed.data.actualEndDate) : null,
      status: parsed.data.status,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      fileUrl: parsed.data.fileUrl || null,
      driveFileId: parsed.data.driveFileId || null,
      fileMimeType: parsed.data.fileMimeType || null,
    },
    include: { category: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    description: `Menambahkan project "${project.projectName}" (${project.projectNumber}).`,
  });

  return NextResponse.json({ project }, { status: 201 });
}
