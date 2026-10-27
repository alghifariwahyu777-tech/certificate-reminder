import { prisma } from "@/lib/prisma";
import { getJakartaToday } from "@/lib/status";

/**
 * Personnel mapping (SDB — Sumber Daya Bersama). One employee can sit on
 * several running projects; this module answers "who is on what" and "whose
 * certification runs out while they're still assigned".
 */

export type CertWarning = { name: string; expiryDate: string; expired: boolean };

/**
 * Certifications that expire before `until`. Renewals are often stored as a
 * new record, so per certification name only the latest expiry counts — an
 * old, already-renewed record doesn't raise a false alarm.
 */
export function certWarnings(
  certs: { certificationName: string; expiryDate: Date; deletedAt: Date | null }[],
  until: Date,
  today: Date
): CertWarning[] {
  const latest = new Map<string, { name: string; expiry: Date }>();
  for (const c of certs) {
    if (c.deletedAt) continue;
    const key = c.certificationName.trim().toLowerCase();
    const cur = latest.get(key);
    if (!cur || c.expiryDate > cur.expiry) latest.set(key, { name: c.certificationName, expiry: c.expiryDate });
  }
  return [...latest.values()]
    .filter((c) => c.expiry.getTime() <= until.getTime())
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime())
    .map((c) => ({ name: c.name, expiryDate: c.expiry.toISOString().slice(0, 10), expired: c.expiry.getTime() < today.getTime() }));
}

export type MappingRow = {
  employeeId: string;
  name: string;
  nip: string | null;
  position: string | null;
  department: string | null;
  activeProjects: number;
  assignments: {
    projectId: string;
    projectNumber: string;
    projectName: string;
    role: string;
    start: string | null;
    end: string;
  }[];
  warnings: CertWarning[];
};

/** Rows for the mapping matrix: every active employee with ≥1 running assignment (or all active employees when `includeIdle`). */
export async function getPersonnelMapping(includeIdle = false): Promise<MappingRow[]> {
  const today = getJakartaToday();
  const employees = await prisma.employee.findMany({
    where: { isActive: true, ...(includeIdle ? {} : { assignments: { some: { project: { deletedAt: null, status: "ONGOING" } } } }) },
    include: {
      department: { select: { name: true } },
      certifications: { select: { certificationName: true, expiryDate: true, deletedAt: true } },
      assignments: {
        where: { project: { deletedAt: null, status: "ONGOING" } },
        include: { project: { select: { id: true, projectNumber: true, projectName: true, startDate: true, targetEndDate: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return employees
    .map((e) => {
      const assignments = e.assignments.map((a) => ({
        projectId: a.project.id,
        projectNumber: a.project.projectNumber,
        projectName: a.project.projectName,
        role: a.role,
        start: (a.startDate ?? a.project.startDate)?.toISOString().slice(0, 10) ?? null,
        end: (a.endDate ?? a.project.targetEndDate).toISOString().slice(0, 10),
      }));
      const until = assignments.length
        ? new Date(Math.max(...assignments.map((a) => Date.parse(a.end))))
        : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        employeeId: e.id,
        name: e.name,
        nip: e.employeeId,
        position: e.position,
        department: e.department?.name ?? null,
        activeProjects: new Set(assignments.map((a) => a.projectId)).size,
        assignments,
        warnings: certWarnings(e.certifications, until, today),
      };
    })
    .sort((a, b) => b.activeProjects - a.activeProjects || a.name.localeCompare(b.name));
}
