import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "Pilih minimal satu sertifikat."),
});

/** Bulk soft-delete — moves the selected certificates to Trash rather than removing them. */
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

  const certificates = await prisma.certificate.findMany({
    where: { id: { in: parsed.data.ids }, deletedAt: null },
    select: { id: true, certificateNumber: true },
  });

  const result = await prisma.certificate.updateMany({
    where: { id: { in: certificates.map((c) => c.id) } },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "DELETE",
    entityType: "Certificate",
    description: `Memindahkan ${result.count} sertifikat ke Trash sekaligus: ${certificates
      .map((c) => c.certificateNumber)
      .join(", ")}.`,
  });

  return NextResponse.json({ deletedCount: result.count });
}
