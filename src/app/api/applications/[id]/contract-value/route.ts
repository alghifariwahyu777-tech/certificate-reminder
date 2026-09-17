import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { contractValueSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const application = await prisma.application.findUnique({ where: { id: params.id } });
  if (!application) return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = contractValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: { contractValue: parsed.data.contractValue },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Application",
    entityId: application.id,
    description: `Mengubah nilai kontrak permohonan ${application.applicationNumber} menjadi Rp ${parsed.data.contractValue.toLocaleString("id-ID")}.`,
  });

  return NextResponse.json({ application: updated });
}
