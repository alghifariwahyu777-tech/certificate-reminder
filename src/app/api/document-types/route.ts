import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { documentTypeSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const documentTypes = await prisma.documentType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true } } },
  });

  return NextResponse.json({ documentTypes });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = documentTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.documentType.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ message: "Jenis dokumen dengan nama ini sudah ada." }, { status: 409 });
  }

  const documentType = await prisma.documentType.create({ data: parsed.data });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Service",
    entityId: documentType.id,
    description: `Menambahkan jenis dokumen "${documentType.name}".`,
  });

  return NextResponse.json({ documentType }, { status: 201 });
}
