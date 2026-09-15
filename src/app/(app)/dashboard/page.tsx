import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getDaysRemaining } from "@/lib/status";
import { REMINDER_MILESTONES } from "@/lib/reminder";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ReminderCenter } from "@/components/dashboard/ReminderCenter";
import { formatDate } from "@/lib/utils";
import {
  FileBadge2,
  ShieldCheck,
  TimerReset,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  // Date boundaries computed once and reused across every count query below,
  // so status ("Active"/"Expiring Soon"/"Expired") stays consistent with
  // lib/status.ts without having to load every row into Node just to filter
  // in JavaScript — each number here is a single COUNT() at the database.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  ]);

  const expiringSoon = within30;

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
    pendingReminderCount = milestoneMatches.filter(
      (c) => !loggedSet.has(`${c.id}:${getDaysRemaining(c.expiryDate)}`)
    ).length;

    const [logs, auditEntries] = await Promise.all([
      prisma.emailLog.findMany({
        orderBy: { sentAt: "desc" },
        take: 6,
        include: { certificate: { select: { certificateNumber: true, certificateName: true } } },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    ]);

    recentEmailLogs = logs.map((l) => ({
      id: l.id,
      certificateNumber: l.certificate.certificateNumber,
      certificateName: l.certificate.certificateName,
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

  const stats = [
    { label: "Total Sertifikat", value: total, icon: FileBadge2, accent: "text-ink bg-ink/5 border-ink/10" },
    {
      label: "Sertifikat Aktif",
      value: active,
      icon: ShieldCheck,
      accent: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
    },
    {
      label: "Akan Berakhir <30 Hari",
      value: within30,
      icon: TimerReset,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: "Akan Berakhir <60 Hari",
      value: within60,
      icon: TimerReset,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: "Akan Berakhir <90 Hari",
      value: within90,
      icon: TimerReset,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: "Sudah Expired",
      value: expired,
      icon: AlertTriangle,
      accent: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
    },
    {
      label: "Renewal Berjalan",
      value: renewalInProgress,
      icon: RefreshCw,
      accent: "text-accent bg-accent/5 border-accent/20",
    },
  ];

  return (
    <>
      <Navbar title="Dashboard" subtitle="Ringkasan status registry sertifikat" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />

      <div className="p-5 md:p-8 space-y-6">
        {(expiringSoon > 0 || expired > 0) && (
          <div className="space-y-2">
            {expiringSoon > 0 && (
              <div className="flex items-center gap-2.5 rounded-md border border-signal-soonBorder bg-signal-soonBg px-4 py-3 text-sm text-signal-soon">
                <span aria-hidden>⚠️</span>
                <span>
                  <strong>{expiringSoon}</strong> sertifikat akan berakhir dalam 30 hari.
                </span>
              </div>
            )}
            {expired > 0 && (
              <div className="flex items-center gap-2.5 rounded-md border border-signal-expiredBorder bg-signal-expiredBg px-4 py-3 text-sm text-signal-expired">
                <span aria-hidden>🔴</span>
                <span>
                  <strong>{expired}</strong> sertifikat telah kedaluwarsa.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5">
                    {s.label}
                  </p>
                  <p className="font-display text-2xl font-semibold text-ink font-mono">{s.value}</p>
                </div>
                <div className={`h-9 w-9 rounded flex items-center justify-center border ${s.accent}`}>
                  <s.icon className="h-4.5 w-4.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-semibold text-ink text-base">Segera Berakhir</h3>
                <p className="text-xs text-slate-500 mt-0.5">Diurutkan berdasarkan tanggal expired terdekat</p>
              </div>
              <Link
                href="/certificate"
                className="text-xs font-medium text-accent hover:text-accent-light flex items-center gap-1"
              >
                Lihat semua <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">Sertifikat</th>
                    <th className="px-5 py-2.5 font-medium">Kategori</th>
                    <th className="px-5 py-2.5 font-medium">Expired</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada sertifikat yang perlu diperhatikan saat ini.
                      </td>
                    </tr>
                  )}
                  {upcoming.map((c) => {
                    const days = getDaysRemaining(c.expiryDate);
                    return (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/certificate/${c.id}`} className="font-medium text-ink hover:text-accent">
                            {c.certificateName}
                          </Link>
                          <p className="text-xs text-slate-400 font-mono">{c.certificateNumber}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{c.category.name}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatDate(c.expiryDate)}
                          <p className="text-xs text-slate-400">
                            {days < 0 ? `${Math.abs(days)} hari lalu` : `${days} hari lagi`}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge expiryDate={c.expiryDate} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-ink text-base">Sertifikat per Kategori</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribusi jumlah sertifikat</p>
            </div>
            <CardContent>
              <CategoryChart data={chartData} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-display font-semibold text-ink text-base">Tren Sertifikat Akan Berakhir</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jumlah sertifikat yang berakhir per bulan, 12 bulan ke depan</p>
            </div>
            <CardContent>
              <MonthlyTrendChart data={trendData} />
            </CardContent>
          </Card>

          {session?.role === "ADMIN" && (
            <div className="lg:col-span-2">
              <RecentActivity items={recentActivity} />
            </div>
          )}
        </div>

        {session?.role === "ADMIN" && (
          <ReminderCenter
            pendingCount={pendingReminderCount}
            emailConfigured={!!process.env.RESEND_API_KEY}
            recentLogs={recentEmailLogs}
          />
        )}
      </div>
    </>
  );
}
