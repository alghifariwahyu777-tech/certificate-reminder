import type { Prisma } from "@prisma/client";

/**
 * Paket pekerjaan: derived contracts (SPK, PO, surat pesanan, work order)
 * under one project's main contract.
 *
 * When a project uses packages, its contract value is the total of its
 * packages and its period runs from the earliest package start to the latest
 * package end. Each package is monitored on its own by narrowing the project
 * to that package's activities, terms, RAB lines and costs; every calculation
 * (progress, S-curve, SPI/CPI, margin, PAD) then runs unchanged.
 */

export const PACKAGE_DOC_TYPES = [
  ["SPK", "SPK"],
  ["PO", "PO"],
  ["SP", "Surat Pesanan"],
  ["WO", "Work Order"],
  ["OTHER", "Lainnya"],
] as const;
export const PACKAGE_DOC_LABEL: Record<string, string> = Object.fromEntries(PACKAGE_DOC_TYPES);

export const PACKAGE_STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Batal" };

type PackageLike = { sequence: number; name: string; docType: string; docNumber: string | null };

/** "Paket 2, Survey Blok A" */
export function packageTitle(p: Pick<PackageLike, "sequence" | "name">): string {
  return `Paket ${p.sequence}, ${p.name}`;
}

/** "SPK No. 045/SPK/2026" or "SPK" when the number is not filled in */
export function packageDocument(p: Pick<PackageLike, "docType" | "docNumber">): string {
  const t = PACKAGE_DOC_LABEL[p.docType] ?? p.docType;
  return p.docNumber ? `${t} No. ${p.docNumber}` : t;
}

/** The parts of a loaded project that this module needs; works with the detail-page and portfolio loaders. */
type ScopableProject = {
  contractValue: Prisma.Decimal | null;
  startDate: Date | null;
  targetEndDate: Date;
  actualEndDate: Date | null;
  status: string;
  baselineLockedAt: Date | null;
  milestones: { packageId: string | null }[];
  terms: { packageId: string | null }[];
  budgetItems: { packageId: string | null }[];
  expenses: { packageId: string | null }[];
  progressPlans: unknown[];
  progressReports: { source: string }[];
  snapshots: unknown[];
};

type PackageRow = {
  id: string;
  value: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date;
  actualEndDate: Date | null;
  status: string;
};

/**
 * The project narrowed to one package: its value, period and status, and only
 * the activities, terms, RAB lines and costs linked to it. Project-wide items
 * that cannot be split (the official contract S-curve, typed project %, weekly
 * snapshots, the locked baseline) are left out so they do not distort the
 * package figures.
 */
export function scopeToPackage<P extends ScopableProject>(project: P, pkg: PackageRow): P {
  const mine = <T extends { packageId: string | null }>(rows: T[]) => rows.filter((r) => r.packageId === pkg.id);
  return {
    ...project,
    contractValue: pkg.value,
    startDate: pkg.startDate ?? project.startDate,
    targetEndDate: pkg.endDate,
    actualEndDate: pkg.status === "COMPLETED" ? pkg.actualEndDate ?? pkg.endDate : null,
    status: pkg.status,
    baselineLockedAt: null,
    milestones: mine(project.milestones),
    terms: mine(project.terms),
    budgetItems: mine(project.budgetItems),
    expenses: mine(project.expenses),
    progressPlans: [],
    progressReports: project.progressReports.filter((r) => r.source === "ACTIVITY"),
    snapshots: [],
  };
}

/** Contract value and period of a project computed from its packages (cancelled packages do not count). */
export function totalsFromPackages(pkgs: PackageRow[]): { contractValue: number | null; startDate: Date | null; targetEndDate: Date | null } {
  const live = pkgs.filter((p) => p.status !== "CANCELLED");
  if (!live.length) return { contractValue: null, startDate: null, targetEndDate: null };
  const values = live.map((p) => (p.value === null ? null : Number(p.value)));
  const starts = live.map((p) => p.startDate).filter((d): d is Date => !!d);
  return {
    contractValue: values.some((v) => v !== null) ? values.reduce<number>((s, v) => s + (v ?? 0), 0) : null,
    startDate: starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null,
    targetEndDate: new Date(Math.max(...live.map((p) => p.endDate.getTime()))),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- works with the plain and the extended (retrying) Prisma client and their transactions */
type Tx = {
  project: { findUnique: (args: any) => Promise<any>; update: (args: any) => Promise<any> };
  projectPackage: { findMany: (args: any) => Promise<any[]> };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Keep the project's contract value and period equal to the totals of its packages. */
export async function syncProjectFromPackages(tx: Tx, projectId: string): Promise<void> {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { usePackages: true } });
  if (!project?.usePackages) return;
  const pkgs = (await tx.projectPackage.findMany({ where: { projectId } })) as PackageRow[];
  const t = totalsFromPackages(pkgs);
  if (!t.targetEndDate) return;
  await tx.project.update({
    where: { id: projectId },
    data: { contractValue: t.contractValue, ...(t.startDate ? { startDate: t.startDate } : {}), targetEndDate: t.targetEndDate },
  });
}
