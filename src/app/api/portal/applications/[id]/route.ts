import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findFirst({
    where: { id: params.id, clientId: session.clientId },
    include: {
      service: {
        include: { requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } } },
      },
      documents: { orderBy: [{ serviceRequirementId: "asc" }, { version: "desc" }] },
    },
  });

  if (!application) {
    return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ application });
}
