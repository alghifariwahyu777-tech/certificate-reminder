import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { projectAddendumSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const addenda = await prisma.projectAddendum.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ addenda });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const project = await prisma.project.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = projectAddendumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const [addendum] = await prisma.$transaction([
    prisma.projectAddendum.create({
      data: {
        projectId: project.id,
        addendumNumber: parsed.data.addendumNumber,
        description: parsed.data.description || null,
        previousEndDate: project.targetEndDate,
        newTargetEndDate: new Date(parsed.data.newTargetEndDate),
        newContractValue: parsed.data.newContractValue || null,
        fileUrl: parsed.data.fileUrl || null,
        driveFileId: parsed.data.driveFileId || null,
        fileMimeType: parsed.data.fileMimeType || null,
        createdBy: auth.session.name,
      },
    }),
    prisma.project.update({
      where: { id: project.id },
      data: {
        targetEndDate: new Date(parsed.data.newTargetEndDate),
        ...(parsed.data.newContractValue ? { contractValue: parsed.data.newContractValue } : {}),
      },
    }),
  ]);

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "ProjectAddendum",
    entityId: addendum.id,
    description: `Menambahkan ${parsed.data.addendumNumber} untuk project "${project.projectName}": target selesai baru ${parsed.data.newTargetEndDate}.`,
  });

  return NextResponse.json({ addendum }, { status: 201 });
}
