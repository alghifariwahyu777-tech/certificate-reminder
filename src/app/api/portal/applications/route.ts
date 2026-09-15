import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { applicationSchema } from "@/lib/validations";
import { generateApplicationNumber } from "@/lib/application";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true, code: true } } },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { id: session.clientId } });
  if (!client) return NextResponse.json({ message: "Klien tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const targetService = await prisma.service.findFirst({ where: { id: parsed.data.serviceId, isActive: true } });
  if (!targetService) {
    return NextResponse.json({ message: "Layanan tidak ditemukan atau tidak aktif." }, { status: 404 });
  }

  const applicationNumber = await generateApplicationNumber();

  const application = await prisma.application.create({
    data: {
      applicationNumber,
      clientId: session.clientId,
      serviceId: parsed.data.serviceId,
      contactName: parsed.data.contactName,
      contactPosition: parsed.data.contactPosition || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      description: parsed.data.description || null,
      status: "DRAFT",
    },
  });

  await logAudit({
    userName: `${session.name} (${client.name})`,
    action: "CREATE",
    entityType: "Application",
    entityId: application.id,
    description: `${session.name} membuat permohonan ${application.applicationNumber} untuk layanan "${targetService.name}".`,
  });

  return NextResponse.json({ application }, { status: 201 });
}
