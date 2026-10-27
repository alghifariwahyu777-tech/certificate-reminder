import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { projectMonitoringSettingsSchema } from "@/lib/validations";
import { getMonitoringThresholds } from "@/lib/project-monitoring";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ thresholds: await getMonitoringThresholds() });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = projectMonitoringSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "ProjectMonitoring",
    description: `Mengubah ambang monitoring project: waspada ${parsed.data.projectDeviationWarning} poin, kritis ${parsed.data.projectDeviationCritical} poin, progres basi ${parsed.data.projectProgressStaleDays} hari, invoice telat ${parsed.data.projectInvoiceOverdueDays} hari, margin tergerus ${parsed.data.projectMarginDropAlert} poin.`,
  });

  return NextResponse.json({ thresholds: await getMonitoringThresholds() });
}
