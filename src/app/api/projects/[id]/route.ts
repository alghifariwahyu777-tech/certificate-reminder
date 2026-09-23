import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, addenda: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const project = await prisma.project.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  if (parsed.data.projectNumber !== project.projectNumber) {
    const duplicate = await prisma.project.findUnique({ where: { projectNumber: parsed.data.projectNumber } });
    if (duplicate) {
      return NextResponse.json({ message: "Nomor project ini sudah dipakai." }, { status: 409 });
    }
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
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
      ...(parsed.data.fileUrl
        ? {
            fileUrl: parsed.data.fileUrl,
            driveFileId: parsed.data.driveFileId || null,
            fileMimeType: parsed.data.fileMimeType || null,
          }
        : {}),
    },
    include: { category: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Project",
    entityId: updated.id,
    description: `Mengubah data project "${updated.projectName}" (${updated.projectNumber}).`,
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const project = await prisma.project.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });

  await prisma.project.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Project",
    entityId: project.id,
    description: `Memindahkan project "${project.projectName}" (${project.projectNumber}) ke Trash.`,
  });

  return NextResponse.json({ success: true });
}
