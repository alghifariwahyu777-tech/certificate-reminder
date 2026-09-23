import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [certificates, personnelCertifications, projects, equipment] = await Promise.all([
    prisma.certificate.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true, client: true },
    }),
    prisma.personnelCertification.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true, employee: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true },
    }),
    prisma.equipment.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: true, pic: true },
    }),
  ]);

  return NextResponse.json({ certificates, personnelCertifications, projects, equipment });
}
