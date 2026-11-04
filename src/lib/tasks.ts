import { prisma } from "@/lib/prisma";
import { getJakartaToday } from "@/lib/status";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { getPersonnelMapping } from "@/lib/personnel-mapping";
import { buildAttention, type TaskOwner } from "@/lib/project-tasks";
import type { Role } from "@/lib/permissions";

/**
 * Everything the departments have to act on, in one list. Each task names the
 * department that acts and links straight to the place where it is done, so
 * the work that passes between PM, QHSE, HC, Keuangan and management is
 * visible to all of them.
 */
export type Task = {
  key: string;
  owner: TaskOwner;
  tone: "bad" | "warn";
  title: string;
  /** Project name, or the kind of data for tasks outside projects. */
  subject: string;
  href: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Which department's tasks a role sees first. */
export function ownerOfRole(role: Role | string | undefined): TaskOwner | null {
  switch (role) {
    case "PM":
    case "QHSE":
    case "HC":
    case "FINANCE":
    case "MANAGEMENT":
    case "ADMIN":
      return role;
    default:
      return null;
  }
}

export async function getTasks(): Promise<Task[]> {
  const today = getJakartaToday();
  const t = today.getTime();
  const in30 = new Date(t + 30 * DAY_MS);
  const notDeleted = { deletedAt: null } as const;

  const [portfolio, mapping, persExpired, persSoon, eqExpired, eqSoon, certExpired, certSoon, appsWaiting] = await Promise.all([
    getProjectPortfolio(),
    getPersonnelMapping(false),
    prisma.personnelCertification.count({ where: { ...notDeleted, expiryDate: { lt: today } } }),
    prisma.personnelCertification.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in30 } } }),
    prisma.equipment.count({ where: { ...notDeleted, nextCalibrationDate: { lt: today } } }),
    prisma.equipment.count({ where: { ...notDeleted, nextCalibrationDate: { gte: today, lte: in30 } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { lt: today } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in30 } } }),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "DOCUMENT_REVIEW"] } } }),
  ]);

  const tasks: Task[] = buildAttention(portfolio.rows, portfolio.today).map((a, i) => ({
    key: `p${i}`,
    owner: a.owner,
    tone: a.tone,
    title: a.text,
    subject: a.name,
    href: `/projects/${a.id}${a.at ? `#${a.at}` : ""}`,
  }));

  // Human Capital: certifications of people who are on a running project
  for (const p of mapping) {
    const expired = p.warnings.filter((w) => w.expired);
    if (expired.length)
      tasks.push({
        key: `hc-${p.employeeId}`,
        owner: "HC",
        tone: "bad",
        title: `${p.name} bertugas di ${p.activeProjects} project dengan sertifikasi yang sudah berakhir: ${expired.map((w) => w.name).join(", ")}.`,
        subject: "Penugasan personil",
        href: "/projects/personnel",
      });
  }
  if (persExpired) tasks.push({ key: "hc-exp", owner: "HC", tone: "bad", title: `${persExpired} sertifikasi personil sudah berakhir.`, subject: "Sertifikasi personil", href: "/personnel-certifications" });
  if (persSoon) tasks.push({ key: "hc-soon", owner: "HC", tone: "warn", title: `${persSoon} sertifikasi personil berakhir dalam 30 hari.`, subject: "Sertifikasi personil", href: "/personnel-certifications" });

  // QHSE: calibration
  if (eqExpired) tasks.push({ key: "q-exp", owner: "QHSE", tone: "bad", title: `${eqExpired} alat sudah melewati jadwal kalibrasi.`, subject: "Kalibrasi alat", href: "/equipment" });
  if (eqSoon) tasks.push({ key: "q-soon", owner: "QHSE", tone: "warn", title: `${eqSoon} alat harus dikalibrasi dalam 30 hari.`, subject: "Kalibrasi alat", href: "/equipment" });

  // Admin: client certificates and applications
  if (appsWaiting) tasks.push({ key: "a-app", owner: "ADMIN", tone: "warn", title: `${appsWaiting} permohonan klien menunggu pemeriksaan.`, subject: "Permohonan", href: "/applications" });
  if (certExpired) tasks.push({ key: "a-exp", owner: "ADMIN", tone: "bad", title: `${certExpired} sertifikat klien sudah berakhir.`, subject: "Sertifikat klien", href: "/certificate" });
  if (certSoon) tasks.push({ key: "a-soon", owner: "ADMIN", tone: "warn", title: `${certSoon} sertifikat klien berakhir dalam 30 hari.`, subject: "Sertifikat klien", href: "/certificate" });

  // Management: decisions, not data entry
  const ongoing = portfolio.rows.filter((r) => r.status === "ONGOING");
  const critical = ongoing.filter((r) => r.summary.health === "KRITIS");
  if (critical.length)
    tasks.push({
      key: "m-crit",
      owner: "MANAGEMENT",
      tone: "bad",
      title: `${critical.length} project berstatus kritis memerlukan keputusan: ${critical.slice(0, 3).map((r) => r.projectName).join(", ")}${critical.length > 3 ? ", dan lainnya" : ""}.`,
      subject: "Portofolio project",
      href: "/projects/dashboard#ringkasan",
    });
  const below = ongoing.filter((r) => r.margin.belowTarget);
  if (below.length) {
    const gap = below.reduce((s, r) => s + r.margin.targetGap, 0);
    tasks.push({
      key: "m-margin",
      owner: "MANAGEMENT",
      tone: "warn",
      title: `${below.length} project diproyeksikan di bawah target margin, total kekurangan ${(gap / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} juta rupiah.`,
      subject: "Portofolio project",
      href: "/projects/dashboard#keuangan",
    });
  }

  return tasks.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}
