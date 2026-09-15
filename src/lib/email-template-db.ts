import { prisma } from "@/lib/prisma";
import { DEFAULT_SUBJECT, DEFAULT_BODY_HTML, DEFAULT_SIMPLE_FIELDS } from "@/lib/email-template";

/** Fetches the stored template, seeding it with sensible defaults on first use. */
export async function getEmailTemplate() {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.emailTemplate.create({
    data: {
      id: "default",
      mode: "SIMPLE",
      subject: DEFAULT_SUBJECT,
      bodyHtml: DEFAULT_BODY_HTML,
      ...DEFAULT_SIMPLE_FIELDS,
    },
  });
}
