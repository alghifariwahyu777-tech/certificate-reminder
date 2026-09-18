import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { getClientSession } from "@/lib/client-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const settingsSchema = z.object({
  adminWhatsappNumber: z
    .string()
    .regex(/^[0-9]*$/, "Nomor hanya boleh berisi angka, tanpa spasi/simbol")
    .max(20, "Maksimal 20 digit")
    .optional(),
});

export async function GET() {
  // Readable by internal Admin/Viewer AND Client Portal users — the Portal's
  // floating WhatsApp button needs this without being an admin.
  const internalSession = await getSession();
  const clientSession = internalSession ? null : await getClientSession();
  if (!internalSession && !clientSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings: settings || { adminWhatsappNumber: null } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { adminWhatsappNumber: parsed.data.adminWhatsappNumber || null },
    create: { id: "default", adminWhatsappNumber: parsed.data.adminWhatsappNumber || null },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Auth",
    description: "Mengubah pengaturan aplikasi (nomor WhatsApp admin).",
  });

  return NextResponse.json({ settings });
}
