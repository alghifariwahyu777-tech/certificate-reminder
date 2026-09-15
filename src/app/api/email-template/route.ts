import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getEmailTemplate } from "@/lib/email-template-db";
import { emailTemplateSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const template = await getEmailTemplate();
  return NextResponse.json({ template });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = emailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const data =
    parsed.data.mode === "SIMPLE"
      ? {
          mode: "SIMPLE" as const,
          subject: parsed.data.subject,
          companyName: parsed.data.companyName,
          systemName: parsed.data.systemName,
          greeting: parsed.data.greeting,
          introText: parsed.data.introText,
          closingText: parsed.data.closingText,
          buttonText: parsed.data.buttonText,
          footerText: parsed.data.footerText,
        }
      : {
          mode: "ADVANCED" as const,
          subject: parsed.data.subject,
          bodyHtml: parsed.data.bodyHtml,
        };

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
    description: `Mengubah template email reminder (mode ${parsed.data.mode === "SIMPLE" ? "Sederhana" : "Lanjutan"}).`,
  });

  return NextResponse.json({ template });
}
