import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SUBJECT, DEFAULT_BODY_HTML, DEFAULT_SIMPLE_FIELDS } from "@/lib/email-template";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE";

  const data =
    mode === "ADVANCED"
      ? { mode: "ADVANCED" as const, subject: DEFAULT_SUBJECT, bodyHtml: DEFAULT_BODY_HTML }
      : { mode: "SIMPLE" as const, subject: DEFAULT_SUBJECT, ...DEFAULT_SIMPLE_FIELDS };

  const template = await prisma.emailTemplate.upsert({
    where: { id: "default" },
    update: { ...data, updatedBy: auth.session.name },
    create: { id: "default", ...data, updatedBy: auth.session.name },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Reminder",
    description: `Mereset template email reminder (mode ${mode === "SIMPLE" ? "Sederhana" : "Lanjutan"}) ke default.`,
  });

  return NextResponse.json({ template });
}
