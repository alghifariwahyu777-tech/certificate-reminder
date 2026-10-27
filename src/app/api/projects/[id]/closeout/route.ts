import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectCloseoutSchema } from "@/lib/validations";
import { guardProjectWrite, auditProjectMonitoring } from "@/lib/project-subresource";

/** Saves the close-out checklist (one row per project, created on first save). */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const g = await guardProjectWrite(context);
  if ("error" in g) return g.error;
  const parsed = projectCloseoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  }
  const v = parsed.data;
  const data = {
    bappDate: v.bappDate ? new Date(v.bappDate) : null,
    bastDate: v.bastDate ? new Date(v.bastDate) : null,
    finalReportDate: v.finalReportDate ? new Date(v.finalReportDate) : null,
    satisfaction: v.satisfaction,
    lessonsLearned: v.lessonsLearned?.trim() || null,
    notes: v.notes?.trim() || null,
    fileUrl: v.fileUrl || null,
    driveFileId: v.driveFileId || null,
    fileMimeType: v.fileMimeType || null,
    updatedBy: g.session.name,
  };
  const closeout = await prisma.projectCloseout.upsert({
    where: { projectId: g.project.id },
    update: data,
    create: { projectId: g.project.id, ...data },
  });
  await auditProjectMonitoring(g.session, g.project, "UPDATE", closeout.id, "Memperbarui penutupan project");
  return NextResponse.json({ closeout });
}
