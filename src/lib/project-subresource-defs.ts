import { prisma } from "@/lib/prisma";
import {
  projectAssignmentSchema,
  projectBudgetItemSchema,
  projectExpenseSchema,
  projectIssueSchema,
  projectMilestoneSchema,
  projectProgressReportSchema,
  projectTermSchema,
} from "@/lib/validations";
import { emptyToNull, toDate, type SubresourceDef } from "@/lib/project-subresource";
import { getJakartaToday } from "@/lib/status";

const files = (v: { fileUrl?: string | null; driveFileId?: string | null; fileMimeType?: string | null }) => ({
  fileUrl: v.fileUrl || null,
  driveFileId: v.driveFileId || null,
  fileMimeType: v.fileMimeType || null,
});

/* eslint-disable @typescript-eslint/no-explicit-any -- data shapes are validated by zod + built in toData */

export const milestoneDef: SubresourceDef<typeof projectMilestoneSchema> = {
  label: "milestone",
  schema: projectMilestoneSchema,
  describe: (v) => v.name,
  toData: (v) => ({
    name: v.name,
    description: emptyToNull(v.description),
    sequence: v.sequence,
    weight: v.weight,
    plannedDate: toDate(v.plannedDate),
    status: v.status,
    // a DONE milestone always has a completion date (it drives actual progress);
    // anything not DONE has none
    actualDate: v.status === "DONE" ? toDate(v.actualDate) ?? getJakartaToday() : null,
    notes: emptyToNull(v.notes),
    ...files(v),
  }),
  create: (data) => prisma.projectMilestone.create({ data: data as any }),
  update: (id, data) => prisma.projectMilestone.update({ where: { id }, data }),
  remove: (id) => prisma.projectMilestone.delete({ where: { id } }),
  findOwner: (id) => prisma.projectMilestone.findUnique({ where: { id }, select: { projectId: true } }),
};

export const progressReportDef: SubresourceDef<typeof projectProgressReportSchema> = {
  label: "laporan progres",
  schema: projectProgressReportSchema,
  describe: (v) => `${v.reportDate} — ${v.actualPercent}%`,
  toData: (v, { session, isCreate }) => ({
    reportDate: new Date(v.reportDate),
    actualPercent: v.actualPercent,
    summary: emptyToNull(v.summary),
    nextPlan: emptyToNull(v.nextPlan),
    ...files(v),
    ...(isCreate ? { createdBy: session.name } : {}),
  }),
  create: (data) => prisma.projectProgressReport.create({ data: data as any }),
  update: (id, data) => prisma.projectProgressReport.update({ where: { id }, data }),
  remove: (id) => prisma.projectProgressReport.delete({ where: { id } }),
  findOwner: (id) => prisma.projectProgressReport.findUnique({ where: { id }, select: { projectId: true } }),
};

export const termDef: SubresourceDef<typeof projectTermSchema> = {
  label: "termin",
  schema: projectTermSchema,
  describe: (v) => v.name,
  toData: (v) => {
    const today = getJakartaToday();
    const billed = v.status === "INVOICED" || v.status === "PAID";
    const paid = v.status === "PAID";
    return {
      name: v.name,
      sequence: v.sequence,
      percent: v.percent,
      amount: v.amount,
      requirement: emptyToNull(v.requirement),
      plannedDate: toDate(v.plannedDate),
      status: v.status,
      invoiceNumber: billed ? emptyToNull(v.invoiceNumber) : null,
      invoiceDate: billed ? toDate(v.invoiceDate) ?? today : null,
      dueDate: billed ? toDate(v.dueDate) : null,
      paidDate: paid ? toDate(v.paidDate) ?? today : null,
      paidAmount: paid ? v.paidAmount ?? v.amount : null,
      notes: emptyToNull(v.notes),
      ...files(v),
    };
  },
  create: (data) => prisma.projectTerm.create({ data: data as any }),
  update: (id, data) => prisma.projectTerm.update({ where: { id }, data }),
  remove: (id) => prisma.projectTerm.delete({ where: { id } }),
  findOwner: (id) => prisma.projectTerm.findUnique({ where: { id }, select: { projectId: true } }),
};

export const budgetItemDef: SubresourceDef<typeof projectBudgetItemSchema> = {
  label: "anggaran biaya",
  schema: projectBudgetItemSchema,
  describe: (v) => v.category,
  toData: (v) => ({ category: v.category, description: emptyToNull(v.description), amount: v.amount }),
  create: (data) => prisma.projectBudgetItem.create({ data: data as any }),
  update: (id, data) => prisma.projectBudgetItem.update({ where: { id }, data }),
  remove: (id) => prisma.projectBudgetItem.delete({ where: { id } }),
  findOwner: (id) => prisma.projectBudgetItem.findUnique({ where: { id }, select: { projectId: true } }),
};

export const expenseDef: SubresourceDef<typeof projectExpenseSchema> = {
  label: "realisasi biaya",
  schema: projectExpenseSchema,
  describe: (v) => v.description,
  toData: (v, { session, isCreate }) => ({
    expenseDate: new Date(v.expenseDate),
    category: v.category,
    description: v.description,
    amount: v.amount,
    cause: v.cause,
    referenceNo: emptyToNull(v.referenceNo),
    ...files(v),
    ...(isCreate ? { createdBy: session.name } : {}),
  }),
  create: (data) => prisma.projectExpense.create({ data: data as any }),
  update: (id, data) => prisma.projectExpense.update({ where: { id }, data }),
  remove: (id) => prisma.projectExpense.delete({ where: { id } }),
  findOwner: (id) => prisma.projectExpense.findUnique({ where: { id }, select: { projectId: true } }),
};

export const issueDef: SubresourceDef<typeof projectIssueSchema> = {
  label: "kendala/risiko",
  schema: projectIssueSchema,
  describe: (v) => v.title,
  toData: (v, { session, isCreate }) => ({
    type: v.type,
    title: v.title,
    description: emptyToNull(v.description),
    impact: v.impact,
    owner: emptyToNull(v.owner),
    targetDate: toDate(v.targetDate),
    status: v.status,
    resolution: emptyToNull(v.resolution),
    closedAt: v.status === "CLOSED" ? new Date() : null,
    ...(isCreate ? { createdBy: session.name } : {}),
  }),
  create: (data) => prisma.projectIssue.create({ data: data as any }),
  update: (id, data) => prisma.projectIssue.update({ where: { id }, data }),
  remove: (id) => prisma.projectIssue.delete({ where: { id } }),
  findOwner: (id) => prisma.projectIssue.findUnique({ where: { id }, select: { projectId: true } }),
};

export const assignmentDef: SubresourceDef<typeof projectAssignmentSchema> = {
  label: "penugasan personil",
  schema: projectAssignmentSchema,
  describe: (v) => v.role,
  toData: (v) => ({
    employeeId: v.employeeId,
    role: v.role,
    startDate: toDate(v.startDate),
    endDate: toDate(v.endDate),
    notes: emptyToNull(v.notes),
  }),
  create: (data) => prisma.projectAssignment.create({ data: data as any }),
  update: (id, data) => prisma.projectAssignment.update({ where: { id }, data }),
  remove: (id) => prisma.projectAssignment.delete({ where: { id } }),
  findOwner: (id) => prisma.projectAssignment.findUnique({ where: { id }, select: { projectId: true } }),
};
