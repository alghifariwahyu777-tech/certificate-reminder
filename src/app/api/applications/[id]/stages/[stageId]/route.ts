import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { applicationStageSchema } from "@/lib/validations";
import { STAGE_STATUS_LABELS } from "@/lib/application";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; stageId: string }> }
) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const stage = await prisma.applicationStage.findFirst({
    where: { id: params.stageId, applicationId: params.id },
    include: { workflowStage: true },
  });
  if (!stage) return NextResponse.json({ message: "Tahap tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = applicationStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const now = new Date();
  const wasNotStarted = stage.status === "PENDING";
  const isNowStarting = parsed.data.status === "IN_PROGRESS" && wasNotStarted;
  const isNowCompleting = parsed.data.status === "COMPLETED" && stage.status !== "COMPLETED";

  const updated = await prisma.applicationStage.update({
    where: { id: params.stageId },
    data: {
      status: parsed.data.status,
      picName: parsed.data.picName ?? stage.picName,
      internalNote: parsed.data.internalNote ?? stage.internalNote,
      ...(isNowStarting
        ? {
            startDate: now,
            targetDate: stage.workflowStage.slaDays
              ? new Date(now.getTime() + stage.workflowStage.slaDays * 24 * 60 * 60 * 1000)
              : null,
          }
        : {}),
      ...(isNowCompleting ? { completedDate: now } : {}),
    },
  });

  const application = await prisma.application.findUnique({ where: { id: params.id } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Application",
    entityId: params.id,
    description: `Tahap "${stage.workflowStage.name}" pada permohonan ${application?.applicationNumber} diubah menjadi "${STAGE_STATUS_LABELS[parsed.data.status]}".`,
  });

  return NextResponse.json({ stage: updated });
}
