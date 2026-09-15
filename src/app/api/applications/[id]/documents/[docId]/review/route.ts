import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { documentReviewSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const document = await prisma.applicationDocument.findFirst({
    where: { id: params.docId, applicationId: params.id },
    include: { serviceRequirement: { include: { documentType: true } } },
  });
  if (!document) return NextResponse.json({ message: "Dokumen tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = documentReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const updated = await prisma.applicationDocument.update({
    where: { id: params.docId },
    data: {
      status: parsed.data.status,
      reviewComment: parsed.data.reviewComment || null,
      reviewedBy: auth.session.name,
      reviewedAt: new Date(),
    },
  });

  const application = await prisma.application.findUnique({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Application",
    entityId: params.id,
    description: `Review dokumen "${document.serviceRequirement.documentType.name}" pada permohonan ${application?.applicationNumber}: ${parsed.data.status === "APPROVED" ? "disetujui" : "perlu revisi"}.`,
  });

  return NextResponse.json({ document: updated });
}
