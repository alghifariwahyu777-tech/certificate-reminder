import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { personnelCategorySchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const categories = await prisma.personnelCertificationCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certifications: true } } },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = personnelCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.personnelCertificationCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ message: "Kategori dengan nama ini sudah ada." }, { status: 409 });
  }

  const category = await prisma.personnelCertificationCategory.create({ data: parsed.data });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "PersonnelCertification",
    entityId: category.id,
    description: `Menambahkan kategori sertifikasi personil "${category.name}".`,
  });

  return NextResponse.json({ category }, { status: 201 });
}
