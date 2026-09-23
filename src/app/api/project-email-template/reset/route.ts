import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROJECT_SUBJECT,
  DEFAULT_PROJECT_BODY_HTML,
  DEFAULT_PROJECT_SIMPLE_FIELDS,
} from "@/lib/project-email-template";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE";

  const data =
    mode === "ADVANCED"
      ? { mode: "ADVANCED" as const, subject: DEFAULT_PROJECT_SUBJECT, bodyHtml: DEFAULT_PROJECT_BODY_HTML }
      : { mode: "SIMPLE" as const, subject: DEFAULT_PROJECT_SUBJECT, ...DEFAULT_PROJECT_SIMPLE_FIELDS };

  const template = await prisma.emailTemplate.upsert({
    where: { id: "project" },
    update: { ...data, updatedBy: auth.session.name },
    create: { id: "project", ...data, updatedBy: auth.session.name },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "UPDATE",
    entityType: "Project",
    description: `Mereset template email reminder project (mode ${mode === "SIMPLE" ? "Sederhana" : "Lanjutan"}) ke default.`,
  });

  return NextResponse.json({ template });
}
