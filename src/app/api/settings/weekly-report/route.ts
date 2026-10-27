import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { weeklyReportSettingsSchema } from "@/lib/validations";
import { parseRecipients } from "@/lib/weekly-report-send";

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = weeklyReportSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });

  const v = parsed.data;
  const recipients = parseRecipients(v.weeklyReportRecipients);
  const invalid = (v.weeklyReportRecipients || "")
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && !recipients.includes(e.toLowerCase()));
  if (invalid.length) return NextResponse.json({ message: `Alamat email tidak valid: ${invalid.join(", ")}` }, { status: 400 });
  if (v.weeklyReportEnabled && recipients.length === 0)
    return NextResponse.json({ message: "Isi minimal satu penerima sebelum mengaktifkan laporan mingguan." }, { status: 400 });

  const data = { ...v, weeklyReportRecipients: recipients.join(", ") || null };
  await prisma.appSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "ProjectMonitoring",
    description: `Mengubah pengaturan laporan mingguan (${v.weeklyReportEnabled ? "aktif" : "nonaktif"}, ${recipients.length} penerima) dan permintaan update PIC (${v.picUpdateRequestEnabled ? "aktif" : "nonaktif"}).`,
  });
  return NextResponse.json({ ok: true, recipients });
}
