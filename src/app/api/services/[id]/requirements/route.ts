import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { serviceRequirementSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service) return NextResponse.json({ message: "Layanan tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = serviceRequirementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceRequirement.findUnique({
    where: { serviceId_documentTypeId: { serviceId: params.id, documentTypeId: parsed.data.documentTypeId } },
  });
  if (existing) {
    return NextResponse.json(
      { message: "Jenis dokumen ini sudah menjadi persyaratan layanan ini." },
      { status: 409 }
    );
  }

  const requirement = await prisma.serviceRequirement.create({
    data: { serviceId: params.id, ...parsed.data },
    include: { documentType: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Service",
    entityId: service.id,
    description: `Menambahkan persyaratan dokumen "${requirement.documentType.name}" ke layanan "${service.name}".`,
  });

  return NextResponse.json({ requirement }, { status: 201 });
}
