import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditProject, projectGuard } from "@/lib/project-subresource";
import { syncProjectFromPackages } from "@/lib/project-packages";

type Ctx = { params: Promise<{ id: string; itemId?: string }> };

/**
 * Turn paket pekerjaan on or off for a project. Turning it on the first time
 * makes the current contract "Paket 1" and links every existing activity,
 * term, RAB line and cost to it, so nothing changes in the figures. Turning it
 * off keeps the packages and links (they come back when turned on again);
 * the project's value and period stay at the package totals.
 */
export async function PUT(request: NextRequest, context: Ctx) {
  const g = await projectGuard(context, "project");
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ message: "Data tidak valid." }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id: g.project.id } });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { usePackages: body.enabled } });
    if (!body.enabled) return;
    const existing = await tx.projectPackage.count({ where: { projectId: project.id } });
    if (existing > 0) return syncProjectFromPackages(tx, project.id);
    const first = await tx.projectPackage.create({
      data: {
        projectId: project.id,
        sequence: 1,
        name: project.projectName,
        docType: "SPK",
        docNumber: project.projectNumber,
        value: project.contractValue,
        startDate: project.startDate,
        endDate: project.targetEndDate,
        actualEndDate: project.actualEndDate,
        status: project.status,
        fileUrl: project.fileUrl,
        driveFileId: project.driveFileId,
        fileMimeType: project.fileMimeType,
        createdBy: g.session.name,
      },
      select: { id: true },
    });
    const link = { where: { projectId: project.id, packageId: null }, data: { packageId: first.id } };
    await tx.projectMilestone.updateMany(link);
    await tx.projectTerm.updateMany(link);
    await tx.projectBudgetItem.updateMany(link);
    await tx.projectExpense.updateMany(link);
  });

  await auditProject(g.session, g.project, "UPDATE", project.id, body.enabled ? "Mengaktifkan paket pekerjaan" : "Menonaktifkan paket pekerjaan");
  return NextResponse.json({ ok: true });
}
