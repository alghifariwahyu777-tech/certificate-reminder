import { prisma } from "@/lib/prisma";
import { DEFAULT_SUBJECT, DEFAULT_BODY_HTML, DEFAULT_SIMPLE_FIELDS } from "@/lib/email-template";
import {
  DEFAULT_PERSONNEL_SUBJECT,
  DEFAULT_PERSONNEL_BODY_HTML,
  DEFAULT_PERSONNEL_SIMPLE_FIELDS,
} from "@/lib/personnel-email-template";
import {
  DEFAULT_PROJECT_SUBJECT,
  DEFAULT_PROJECT_BODY_HTML,
  DEFAULT_PROJECT_SIMPLE_FIELDS,
} from "@/lib/project-email-template";
import {
  DEFAULT_EQUIPMENT_SUBJECT,
  DEFAULT_EQUIPMENT_BODY_HTML,
  DEFAULT_EQUIPMENT_SIMPLE_FIELDS,
} from "@/lib/equipment-email-template";

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

/**
 * Same EmailTemplate table, separate row (id: "personnel") — a distinct
 * template for personnel certification reminders, since the tone/fields
 * differ from the client-facing certificate reminder (no "Klien"/"PIC",
 * addressed directly to the employee, no Client Portal link).
 */
export async function getPersonnelEmailTemplate() {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: "personnel" } });
  if (existing) return existing;

  return prisma.emailTemplate.create({
    data: {
      id: "personnel",
      mode: "SIMPLE",
      subject: DEFAULT_PERSONNEL_SUBJECT,
      bodyHtml: DEFAULT_PERSONNEL_BODY_HTML,
      ...DEFAULT_PERSONNEL_SIMPLE_FIELDS,
    },
  });
}

/** Same EmailTemplate table, row id "project". */
export async function getProjectEmailTemplate() {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: "project" } });
  if (existing) return existing;

  return prisma.emailTemplate.create({
    data: {
      id: "project",
      mode: "SIMPLE",
      subject: DEFAULT_PROJECT_SUBJECT,
      bodyHtml: DEFAULT_PROJECT_BODY_HTML,
      ...DEFAULT_PROJECT_SIMPLE_FIELDS,
    },
  });
}

/** Same EmailTemplate table, row id "equipment". */
export async function getEquipmentEmailTemplate() {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: "equipment" } });
  if (existing) return existing;

  return prisma.emailTemplate.create({
    data: {
      id: "equipment",
      mode: "SIMPLE",
      subject: DEFAULT_EQUIPMENT_SUBJECT,
      bodyHtml: DEFAULT_EQUIPMENT_BODY_HTML,
      ...DEFAULT_EQUIPMENT_SIMPLE_FIELDS,
    },
  });
}
