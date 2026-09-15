import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { serviceRequirementSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = serviceRequirementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const requirement = await prisma.serviceRequirement.update({
    where: { id: params.reqId, serviceId: params.id },
    data: parsed.data,
    include: { documentType: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: params.id,
    description: `Mengubah persyaratan dokumen "${requirement.documentType.name}".`,
  });

  return NextResponse.json({ requirement });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const requirement = await prisma.serviceRequirement.findFirst({
    where: { id: params.reqId, serviceId: params.id },
    include: { documentType: true },
  });
  if (!requirement) return NextResponse.json({ message: "Persyaratan tidak ditemukan." }, { status: 404 });

  await prisma.serviceRequirement.delete({ where: { id: params.reqId } });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Service",
    entityId: params.id,
    description: `Menghapus persyaratan dokumen "${requirement.documentType.name}".`,
  });

  return NextResponse.json({ success: true });
}
