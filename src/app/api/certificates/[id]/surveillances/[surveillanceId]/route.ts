import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { surveillanceSchema } from "@/lib/validations";
import { SURVEILLANCE_STATUS_LABELS } from "@/lib/surveillance";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; surveillanceId: string }> }
) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const surveillance = await prisma.surveillance.findFirst({
    where: { id: params.surveillanceId, certificateId: params.id },
    include: { certificate: { select: { certificateNumber: true } } },
  });
  if (!surveillance) return NextResponse.json({ message: "Surveillance tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = surveillanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const isNowCompleting = parsed.data.status === "COMPLETED" && surveillance.status !== "COMPLETED";

  const updated = await prisma.surveillance.update({
    where: { id: params.surveillanceId },
    data: {
      status: parsed.data.status,
      scheduledDate: new Date(parsed.data.scheduledDate),
      picName: parsed.data.picName || null,
      notes: parsed.data.notes || null,
      result: parsed.data.result || null,
      ...(isNowCompleting ? { completedDate: new Date() } : {}),
    },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Certificate",
    entityId: params.id,
    description: `Surveillance ke-${surveillance.sequenceNumber} pada sertifikat ${surveillance.certificate.certificateNumber} diubah menjadi "${SURVEILLANCE_STATUS_LABELS[parsed.data.status]}".`,
  });

  return NextResponse.json({ surveillance: updated });
}
