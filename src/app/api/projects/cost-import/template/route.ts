import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCostTemplate } from "@/lib/project-cost-import";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "ONGOING" },
    select: { projectNumber: true, projectName: true },
    orderBy: { projectNumber: "asc" },
  });
  const buf = await buildCostTemplate(projects);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-biaya-rab.xlsx"',
    },
  });
}
