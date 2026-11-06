import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditProject, projectGuard } from "@/lib/project-subresource";
import { syncProjectFromPackages } from "@/lib/project-packages";
import { packageData, parsePackage } from "./shared";

type Ctx = { params: Promise<{ id: string; itemId?: string }> };

/** Add a paket pekerjaan; the project's value and period follow the packages. */
export async function POST(request: NextRequest, context: Ctx) {
  const g = await projectGuard(context, "project");
  if ("error" in g) return g.error;
  const p = await parsePackage(request);
  if ("error" in p) return p.error;
  const project = await prisma.project.findUnique({ where: { id: g.project.id }, select: { usePackages: true } });
  if (!project?.usePackages) return NextResponse.json({ message: "Aktifkan paket pekerjaan terlebih dahulu." }, { status: 400 });
  const last = await prisma.projectPackage.findFirst({ where: { projectId: g.project.id }, orderBy: { sequence: "desc" }, select: { sequence: true } });
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.projectPackage.create({
      data: { projectId: g.project.id, sequence: p.data.sequence ?? (last?.sequence ?? 0) + 1, createdBy: g.session.name, ...packageData(p.data) },
      select: { id: true },
    });
    await syncProjectFromPackages(tx, g.project.id);
    return created;
  });
  await auditProject(g.session, g.project, "CREATE", item.id, `Menambahkan paket pekerjaan "${p.data.name}"`);
  return NextResponse.json({ item }, { status: 201 });
}
