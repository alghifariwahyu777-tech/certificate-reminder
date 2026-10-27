import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getJakartaToday } from "@/lib/status";
import { getProjectWithMonitoring } from "@/lib/project-monitoring";
import type { PicProgressUpdateInput } from "@/lib/validations";

/**
 * Shared logic behind both ways a PIC can report progress — logged in as a
 * PIC account (/pic) or through the signed link in the weekly email
 * (/update/[token]). One short form becomes: a progress report, milestones
 * ticked off, and (optionally) a new issue — so the PIC never has to learn
 * the full admin screens.
 */

const norm = (e: string | null | undefined) => (e || "").trim().toLowerCase();

/** A PIC account owns a project when the project's PIC email is the account email. */
export function picOwnsProject(sessionEmail: string, project: { picEmail: string | null }) {
  return !!project.picEmail && norm(project.picEmail) === norm(sessionEmail);
}

export async function getPicProjects(email: string) {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, picEmail: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true },
    orderBy: [{ status: "asc" }, { targetEndDate: "asc" }],
  });
  const loaded = await Promise.all(projects.map((p) => getProjectWithMonitoring(p.id)));
  return loaded.filter((x): x is NonNullable<typeof x> => x !== null);
}

/** Everything the short update form needs to show. */
export type UpdateFormContext = {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientName: string;
  pic: string;
  status: string;
  targetEndDate: string;
  actualPercent: number;
  plannedPercent: number;
  lastReportDate: string | null;
  openMilestones: { id: string; name: string; weight: number; plannedDate: string | null }[];
};

export async function getUpdateFormContext(projectId: string): Promise<UpdateFormContext | null> {
  const loaded = await getProjectWithMonitoring(projectId);
  if (!loaded) return null;
  const { project, summary } = loaded;
  const last = project.progressReports[0];
  return {
    projectId: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    clientName: project.clientName,
    pic: project.pic,
    status: project.status,
    targetEndDate: project.targetEndDate.toISOString().slice(0, 10),
    actualPercent: summary.actualPercent,
    plannedPercent: summary.plannedPercent,
    lastReportDate: last ? last.reportDate.toISOString().slice(0, 10) : null,
    openMilestones: project.milestones
      .filter((m) => m.status !== "DONE")
      .map((m) => ({
        id: m.id,
        name: m.name,
        weight: Number(m.weight),
        plannedDate: m.plannedDate ? m.plannedDate.toISOString().slice(0, 10) : null,
      })),
  };
}

export async function applyProgressUpdate(
  projectId: string,
  input: PicProgressUpdateInput,
  actor: { name: string; userId?: string | null; via: "LOGIN" | "LINK" }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, projectName: true, projectNumber: true, status: true },
  });
  if (!project) return { error: "Project tidak ditemukan.", status: 404 } as const;
  if (project.status !== "ONGOING") return { error: "Project ini sudah tidak berjalan — update progres ditutup.", status: 400 } as const;

  const reportDate = new Date(input.reportDate);
  if (reportDate.getTime() > getJakartaToday().getTime()) {
    return { error: "Tanggal laporan tidak boleh di masa depan.", status: 400 } as const;
  }

  const milestoneIds = input.completedMilestoneIds.length
    ? (
        await prisma.projectMilestone.findMany({
          where: { projectId, id: { in: input.completedMilestoneIds }, status: { not: "DONE" } },
          select: { id: true, name: true },
        })
      )
    : [];

  const createdBy = actor.via === "LINK" ? `${actor.name} (via email)` : actor.name;
  await prisma.$transaction([
    ...milestoneIds.map((m) =>
      prisma.projectMilestone.update({ where: { id: m.id }, data: { status: "DONE", actualDate: reportDate } })
    ),
    // the report is written after the milestones so, for the same day, the
    // PIC's stated % is what counts (manual report wins on the same date)
    prisma.projectProgressReport.create({
      data: {
        projectId,
        reportDate,
        actualPercent: input.actualPercent,
        summary: input.summary,
        nextPlan: input.nextPlan?.trim() || null,
        fileUrl: input.fileUrl || null,
        driveFileId: input.driveFileId || null,
        fileMimeType: input.fileMimeType || null,
        createdBy,
      },
    }),
    ...(input.issueTitle?.trim()
      ? [
          prisma.projectIssue.create({
            data: { projectId, type: "ISSUE", title: input.issueTitle.trim(), impact: input.issueImpact, status: "OPEN", createdBy },
          }),
        ]
      : []),
  ]);

  await logAudit({
    userId: actor.userId || null,
    userName: actor.name,
    action: "UPDATE",
    entityType: "ProjectMonitoring",
    entityId: projectId,
    description:
      `Update progres oleh PIC${actor.via === "LINK" ? " (link email)" : ""}: ${input.actualPercent}%` +
      (milestoneIds.length ? `, milestone selesai: ${milestoneIds.map((m) => m.name).join(", ")}` : "") +
      (input.issueTitle?.trim() ? `, kendala baru: "${input.issueTitle.trim()}"` : "") +
      ` — project "${project.projectName}" (${project.projectNumber}).`,
  });

  return { ok: true } as const;
}
