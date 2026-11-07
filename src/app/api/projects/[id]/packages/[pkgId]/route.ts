import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditProject, projectGuard } from "@/lib/project-subresource";
import { syncProjectFromPackages } from "@/lib/project-packages";
import { packageData, parsePackage } from "../shared";

type Ctx = { params: Promise<{ id: string; pkgId: string }> };

async function owned(projectId: string, pkgId: string) {
  return prisma.projectPackage.findFirst({ where: { id: pkgId, projectId }, select: { id: true, name: true } });
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const g = await projectGuard(context, "project");
  if ("error" in g) return g.error;
  const { pkgId } = await context.params;
  if (!(await owned(g.project.id, pkgId))) return NextResponse.json({ message: "Paket tidak ditemukan." }, { status: 404 });
  const p = await parsePackage(request);
  if ("error" in p) return p.error;
  await prisma.$transaction(async (tx) => {
    await tx.projectPackage.update({ where: { id: pkgId }, data: { ...packageData(p.data), ...(p.data.sequence !== undefined ? { sequence: p.data.sequence } : {}) } });
    await syncProjectFromPackages(tx, g.project.id);
  }, { timeout: 20000, maxWait: 10000 });
  await auditProject(g.session, g.project, "UPDATE", pkgId, `Mengubah paket pekerjaan "${p.data.name}"`);
  return NextResponse.json({ ok: true });
}

/** Delete a package; its activities, terms, RAB lines and costs stay in the project, unlinked. */
export async function DELETE(_request: NextRequest, context: Ctx) {
  const g = await projectGuard(context, "project");
  if ("error" in g) return g.error;
  const { pkgId } = await context.params;
  const pkg = await owned(g.project.id, pkgId);
  if (!pkg) return NextResponse.json({ message: "Paket tidak ditemukan." }, { status: 404 });
  const count = await prisma.projectPackage.count({ where: { projectId: g.project.id } });
  if (count <= 1) return NextResponse.json({ message: "Paket terakhir tidak dapat dihapus. Nonaktifkan paket pekerjaan bila project tidak lagi dibagi per paket." }, { status: 400 });
  await prisma.$transaction(async (tx) => {
    await tx.projectPackage.delete({ where: { id: pkgId } });
    await syncProjectFromPackages(tx, g.project.id);
  }, { timeout: 20000, maxWait: 10000 });
  await auditProject(g.session, g.project, "DELETE", pkgId, `Menghapus paket pekerjaan "${pkg.name}"`);
  return NextResponse.json({ ok: true });
}
