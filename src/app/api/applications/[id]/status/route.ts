import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { applicationStatusSchema } from "@/lib/validations";
import { APPLICATION_STATUS_LABELS, generateApplicationStages } from "@/lib/application";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const application = await prisma.application.findUnique({ where: { id: params.id } });
  if (!application) return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = applicationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: { status: parsed.data.status, notes: parsed.data.notes ?? application.notes },
  });

  // First time this application becomes APPROVED, instantiate its tracking
  // timeline from the service's configured WorkflowStage template. Safe to
  // call on every APPROVED transition — it no-ops if stages already exist.
  if (parsed.data.status === "APPROVED") {
    await generateApplicationStages(application.id, application.serviceId);
  }

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Application",
    entityId: application.id,
    description: `Mengubah status permohonan ${application.applicationNumber} menjadi "${APPLICATION_STATUS_LABELS[parsed.data.status]}".`,
  });

  return NextResponse.json({ application: updated });
}
