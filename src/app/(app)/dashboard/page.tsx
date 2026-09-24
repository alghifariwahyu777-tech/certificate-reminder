import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getDaysRemaining, getJakartaToday } from "@/lib/status";
import { REMINDER_MILESTONES } from "@/lib/reminder";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ReminderCenter } from "@/components/dashboard/ReminderCenter";

export default async function DashboardPage() {
  const session = await getSession();

  // Date boundaries computed once and reused across every count query below,
  // so status ("Active"/"Expiring Soon"/"Expired") stays consistent with
  // lib/status.ts without having to load every row into Node just to filter
  // in JavaScript — each number here is a single COUNT() at the database.
  const today = getJakartaToday();
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const in60 = new Date(today);
  in60.setDate(in60.getDate() + 60);
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);
  const in365 = new Date(today);
  in365.setDate(in365.getDate() + 365);

  const notDeleted = { deletedAt: null } as const;

  const [
    total,
    active,
    expired,
    within30,
    within60,
    within90,
    renewalInProgress,
    upcoming,
    trendRows,
    categories,
    personnelTotal,
    personnelExpired,
    personnelWithin30,
    personnelUpcoming,
    projectOngoing,
    projectCompleted,
    projectExpired,
    projectWithin30,
    projectUpcoming,
    equipmentTotal,
    equipmentExpired,
    equipmentWithin30,
    equipmentUpcoming,
  ] = await Promise.all([
    prisma.certificate.count({ where: notDeleted }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { gt: in30 } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { lt: today } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in30 } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in60 } } }),
    prisma.certificate.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in90 } } }),
    prisma.certificate.count({
      where: { ...notDeleted, expiryDate: { gte: today, lte: in30 }, renewals: { some: {} } },
    }),
    prisma.certificate.findMany({
      where: { ...notDeleted, expiryDate: { lte: in30 } },
      orderBy: { expiryDate: "asc" },
      take: 8,
      include: { category: true },
    }),
    // Only the one field the trend chart needs — not full rows with joins.
    prisma.certificate.findMany({
      where: { ...notDeleted, expiryDate: { gte: today, lte: in365 } },
      select: { expiryDate: true },
    }),
    prisma.category.findMany({ include: { _count: { select: { certificates: true } } } }),

    // --- Personnel Certification ---
    prisma.personnelCertification.count({ where: notDeleted }),
    prisma.personnelCertification.count({ where: { ...notDeleted, expiryDate: { lt: today } } }),
    prisma.personnelCertification.count({ where: { ...notDeleted, expiryDate: { gte: today, lte: in30 } } }),
    prisma.personnelCertification.findMany({
      where: { ...notDeleted, expiryDate: { lte: in30 } },
      orderBy: { expiryDate: "asc" },
      take: 8,
      include: { category: true, employee: true },
    }),

    // --- Project (ONGOING only — completed/cancelled projects don't need attention) ---
    prisma.project.count({ where: { ...notDeleted, status: "ONGOING" } }),
    prisma.project.count({ where: { ...notDeleted, status: "COMPLETED" } }),
    prisma.project.count({ where: { ...notDeleted, status: "ONGOING", targetEndDate: { lt: today } } }),
    prisma.project.count({
      where: { ...notDeleted, status: "ONGOING", targetEndDate: { gte: today, lte: in30 } },
    }),
    prisma.project.findMany({
      where: { ...notDeleted, status: "ONGOING", targetEndDate: { lte: in30 } },
      orderBy: { targetEndDate: "asc" },
      take: 8,
      include: { category: true },
    }),

    // --- Equipment Calibration ---
    prisma.equipment.count({ where: notDeleted }),
    prisma.equipment.count({ where: { ...notDeleted, nextCalibrationDate: { lt: today } } }),
    prisma.equipment.count({ where: { ...notDeleted, nextCalibrationDate: { gte: today, lte: in30 } } }),
    prisma.equipment.findMany({
      where: { ...notDeleted, nextCalibrationDate: { lte: in30 } },
      orderBy: { nextCalibrationDate: "asc" },
      take: 8,
      include: { category: true, pic: true },
    }),
  ]);

  const chartData = categories.map((c) => ({
    name: c.name,
    total: c._count.certificates,
  }));

  // --- Monthly trend: bucket the lightweight trendRows by month ---
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const trendBuckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: `${monthLabels[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      total: 0,
    };
  });
  const bucketIndex = new Map(trendBuckets.map((b, i) => [b.key, i]));
  for (const row of trendRows) {
    const expiry = new Date(row.expiryDate);
    const key = `${expiry.getFullYear()}-${expiry.getMonth()}`;
    const idx = bucketIndex.get(key);
    if (idx !== undefined) trendBuckets[idx].total += 1;
  }
  const trendData = trendBuckets.map((b) => ({ month: b.month, total: b.total }));

  // --- Reminder Center + Recent Activity (Admin only) ---
  let pendingReminderCount = 0;
  let recentEmailLogs: {
    id: string;
    certificateNumber: string;
    certificateName: string;
    milestoneDays: number;
    status: "SENT" | "FAILED" | "SKIPPED";
    recipient: string;
    sentAt: string;
  }[] = [];
  let recentActivity: { id: string; userName: string; description: string; createdAt: string }[] = [];

  if (session?.role === "ADMIN") {
    // Certificates sitting exactly on a reminder milestone today — a small,
    // targeted query rather than scanning every certificate in JS.
    const milestoneMatches = await prisma.certificate.findMany({
      where: {
        ...notDeleted,
        OR: (REMINDER_MILESTONES as readonly number[]).map((days) => {
          const target = new Date(today);
          target.setDate(target.getDate() + days);
          return { expiryDate: { gte: target, lt: new Date(target.getTime() + 24 * 60 * 60 * 1000) } };
        }),
      },
      select: { id: true, expiryDate: true },
    });

    const alreadyLogged = await prisma.emailLog.findMany({
      where: { certificateId: { in: milestoneMatches.map((c) => c.id) } },
      select: { certificateId: true, milestoneDays: true },
    });
    const loggedSet = new Set(alreadyLogged.map((l) => `${l.certificateId}:${l.milestoneDays}`));
    const pendingCertificates = milestoneMatches.filter(
      (c) => !loggedSet.has(`${c.id}:${getDaysRemaining(c.expiryDate)}`)
    ).length;

    // Same check for personnel certifications — this dashboard widget was
    // originally certificate-only and missed this when that feature was
    // added, so "0 pending" could be wrong whenever the only thing due was
    // a personnel certification, not a client certificate.
    const personnelMilestoneMatches = await prisma.personnelCertification.findMany({
      where: {
        deletedAt: null,
        OR: (REMINDER_MILESTONES as readonly number[]).map((days) => {
          const target = new Date(today);
          target.setDate(target.getDate() + days);
          return { expiryDate: { gte: target, lt: new Date(target.getTime() + 24 * 60 * 60 * 1000) } };
        }),
      },
      select: { id: true, expiryDate: true },
    });

    const personnelAlreadyLogged = await prisma.emailLog.findMany({
      where: { personnelCertificationId: { in: personnelMilestoneMatches.map((c) => c.id) } },
      select: { personnelCertificationId: true, milestoneDays: true },
    });
    const personnelLoggedSet = new Set(
      personnelAlreadyLogged.map((l) => `${l.personnelCertificationId}:${l.milestoneDays}`)
    );
    const pendingPersonnel = personnelMilestoneMatches.filter(
      (c) => !personnelLoggedSet.has(`${c.id}:${getDaysRemaining(c.expiryDate)}`)
    ).length;

    pendingReminderCount = pendingCertificates + pendingPersonnel;

    // Same check for ongoing projects (target end date) and equipment
    // (next calibration date) — the two newest reminder domains.
    const projectMilestoneMatches = await prisma.project.findMany({
      where: {
        deletedAt: null,
        status: "ONGOING",
        OR: (REMINDER_MILESTONES as readonly number[]).map((days) => {
          const target = new Date(today);
          target.setDate(target.getDate() + days);
          return { targetEndDate: { gte: target, lt: new Date(target.getTime() + 24 * 60 * 60 * 1000) } };
        }),
      },
      select: { id: true, targetEndDate: true },
    });

    const projectAlreadyLogged = await prisma.emailLog.findMany({
      where: { projectId: { in: projectMilestoneMatches.map((p) => p.id) } },
      select: { projectId: true, milestoneDays: true },
    });
    const projectLoggedSet = new Set(projectAlreadyLogged.map((l) => `${l.projectId}:${l.milestoneDays}`));
    const pendingProjects = projectMilestoneMatches.filter(
      (p) => !projectLoggedSet.has(`${p.id}:${getDaysRemaining(p.targetEndDate)}`)
    ).length;

    const equipmentMilestoneMatches = await prisma.equipment.findMany({
      where: {
        deletedAt: null,
        OR: (REMINDER_MILESTONES as readonly number[]).map((days) => {
          const target = new Date(today);
          target.setDate(target.getDate() + days);
          return { nextCalibrationDate: { gte: target, lt: new Date(target.getTime() + 24 * 60 * 60 * 1000) } };
        }),
      },
      select: { id: true, nextCalibrationDate: true },
    });

    const equipmentAlreadyLogged = await prisma.emailLog.findMany({
      where: { equipmentId: { in: equipmentMilestoneMatches.map((e) => e.id) } },
      select: { equipmentId: true, milestoneDays: true },
    });
    const equipmentLoggedSet = new Set(equipmentAlreadyLogged.map((l) => `${l.equipmentId}:${l.milestoneDays}`));
    const pendingEquipment = equipmentMilestoneMatches.filter(
      (e) => !equipmentLoggedSet.has(`${e.id}:${getDaysRemaining(e.nextCalibrationDate)}`)
    ).length;

    pendingReminderCount = pendingCertificates + pendingPersonnel + pendingProjects + pendingEquipment;

    const [logs, auditEntries] = await Promise.all([
      prisma.emailLog.findMany({
        where: { certificateId: { not: null } },
        orderBy: { sentAt: "desc" },
        take: 6,
        include: { certificate: { select: { certificateNumber: true, certificateName: true } } },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    ]);

    recentEmailLogs = logs
      .filter((l) => l.certificate !== null)
      .map((l) => ({
        id: l.id,
        certificateNumber: l.certificate!.certificateNumber,
        certificateName: l.certificate!.certificateName,
        milestoneDays: l.milestoneDays,
        status: l.status as "SENT" | "FAILED" | "SKIPPED",
        recipient: l.recipient,
        sentAt: l.sentAt.toISOString(),
      }));
    recentActivity = auditEntries.map((a) => ({
      id: a.id,
      userName: a.userName,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  const certificateData = {
    stats: {
      total,
      active,
      expiringSoon: within30,
      expired,
      extraLabel: "Renewal Berjalan",
      extraValue: renewalInProgress,
    },
    upcoming: upcoming.map((c) => ({
      id: c.id,
      title: c.certificateName,
      subtitle: c.certificateNumber,
      secondary: c.category.name,
      date: c.expiryDate.toISOString(),
      daysRemaining: getDaysRemaining(c.expiryDate),
      detailHref: `/certificate/${c.id}`,
    })),
  };

  const personnelActive = personnelTotal - personnelExpired - personnelWithin30;
  const personnelData = {
    stats: { total: personnelTotal, active: personnelActive, expiringSoon: personnelWithin30, expired: personnelExpired },
    upcoming: personnelUpcoming.map((c) => ({
      id: c.id,
      title: c.certificationName,
      subtitle: c.certificationNumber || "-",
      secondary: `${c.employee.name} · ${c.category.name}`,
      date: c.expiryDate.toISOString(),
      daysRemaining: getDaysRemaining(c.expiryDate),
      detailHref: `/personnel-certifications/${c.id}`,
    })),
  };

  const projectActive = projectOngoing - projectExpired - projectWithin30;
  const projectData = {
    stats: {
      total: projectOngoing,
      active: projectActive,
      expiringSoon: projectWithin30,
      expired: projectExpired,
      extraLabel: "Selesai",
      extraValue: projectCompleted,
    },
    upcoming: projectUpcoming.map((p) => ({
      id: p.id,
      title: p.projectName,
      subtitle: p.projectNumber,
      secondary: `${p.clientName} · ${p.category.name}`,
      date: p.targetEndDate.toISOString(),
      daysRemaining: getDaysRemaining(p.targetEndDate),
      detailHref: `/projects/${p.id}`,
    })),
  };

  const equipmentActive = equipmentTotal - equipmentExpired - equipmentWithin30;
  const equipmentData = {
    stats: { total: equipmentTotal, active: equipmentActive, expiringSoon: equipmentWithin30, expired: equipmentExpired },
    upcoming: equipmentUpcoming.map((e) => ({
      id: e.id,
      title: e.name,
      subtitle: e.assetNumber || "-",
      secondary: `${e.pic.name} · ${e.category.name}`,
      date: e.nextCalibrationDate.toISOString(),
      daysRemaining: getDaysRemaining(e.nextCalibrationDate),
      detailHref: `/equipment/${e.id}`,
    })),
  };

  // Per-domain breakdown for the cross-domain "Perlu Perhatian" banner —
  // each domain's own Expiring Soon + Expired count.
  const attentionBreakdown = [
    { label: "Sertifikat", count: within30 + expired, href: "/certificate" },
    { label: "Sertifikasi Personil", count: personnelWithin30 + personnelExpired, href: "/personnel-certifications" },
    { label: "Project", count: projectWithin30 + projectExpired, href: "/projects" },
    { label: "Equipment", count: equipmentWithin30 + equipmentExpired, href: "/equipment" },
  ].filter((d) => d.count > 0);

  return (
    <>
      <Navbar title="Dashboard" subtitle="Ringkasan seluruh reminder — Certificate, Personnel, Project, Equipment" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />

      <div className="p-5 md:p-8 space-y-6">
        {attentionBreakdown.length > 0 && (
          <div className="rounded-md border border-signal-soonBorder bg-signal-soonBg px-4 py-3">
            <p className="text-sm text-signal-soon font-medium mb-2">⚠️ Perlu Perhatian — total {attentionBreakdown.reduce((s, d) => s + d.count, 0)} item</p>
            <div className="flex flex-wrap gap-2">
              {attentionBreakdown.map((d) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 border border-signal-soonBorder px-3 py-1 text-xs font-medium text-ink dark:text-slate-100 hover:bg-signal-soonBg/50"
                >
                  <strong className="font-mono">{d.count}</strong> {d.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <DashboardTabs
          certificate={certificateData}
          personnel={personnelData}
          project={projectData}
          equipment={equipmentData}
          chartData={chartData}
          trendData={trendData}
        />

        {session?.role === "ADMIN" && (
          <div className="max-w-2xl">
            <RecentActivity items={recentActivity} />
          </div>
        )}

        {session?.role === "ADMIN" && (
          <ReminderCenter
            pendingCount={pendingReminderCount}
            emailConfigured={!!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)}
            recentLogs={recentEmailLogs}
          />
        )}
      </div>
    </>
  );
}
