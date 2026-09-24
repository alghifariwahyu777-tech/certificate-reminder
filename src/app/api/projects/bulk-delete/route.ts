import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "Pilih minimal satu project."),
});

/** Bulk soft-delete — moves the selected projects to Trash rather than removing them. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const items = await prisma.project.findMany({
    where: { id: { in: parsed.data.ids }, deletedAt: null },
    select: { id: true, projectName: true },
  });

  const result = await prisma.project.updateMany({
    where: { id: { in: items.map((c) => c.id) } },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Project",
    description: `Memindahkan ${result.count} project ke Trash sekaligus: ${items
      .map((c) => c.projectName)
      .join(", ")}.`,
  });

  return NextResponse.json({ deletedCount: result.count });
}
