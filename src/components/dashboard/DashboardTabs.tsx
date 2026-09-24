"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileBadge2,
  ShieldCheck,
  TimerReset,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  UserSquare2,
  FolderClock,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";

type UpcomingItem = {
  id: string;
  title: string;
  subtitle: string;
  secondary: string;
  date: string;
  daysRemaining: number;
  detailHref: string;
};

type DomainStats = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  extraLabel?: string; // e.g. "Renewal Berjalan" (Certificate) or "Selesai" (Project)
  extraValue?: number;
};

function statusBadgeFor(days: number) {
  if (days < 0) return <span className="stamp-badge bg-signal-expiredBg text-signal-expired border-signal-expiredBorder">Expired</span>;
  if (days <= 30) return <span className="stamp-badge bg-signal-soonBg text-signal-soon border-signal-soonBorder">Expiring Soon</span>;
  return <span className="stamp-badge bg-signal-activeBg text-signal-active border-signal-activeBorder">Active</span>;
}

function UpcomingTable({ items, emptyText, viewAllHref }: { items: UpcomingItem[]; emptyText: string; viewAllHref: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-display font-semibold text-ink dark:text-slate-100 text-base">Segera Berakhir</h3>
          <p className="text-xs text-slate-500 mt-0.5">Diurutkan berdasarkan tanggal terdekat, 30 hari ke depan</p>
        </div>
        <Link href={viewAllHref} className="text-xs font-medium text-accent hover:text-accent-light flex items-center gap-1">
          Lihat semua <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-2.5 font-medium">Item</th>
              <th className="px-5 py-2.5 font-medium">Keterangan</th>
              <th className="px-5 py-2.5 font-medium">Tanggal</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3">
                  <Link href={item.detailHref} className="font-medium text-ink dark:text-slate-100 hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="text-xs text-slate-400 font-mono">{item.subtitle}</p>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{item.secondary}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {new Date(item.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  <p className="text-xs text-slate-400">
                    {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} hari lalu` : `${item.daysRemaining} hari lagi`}
                  </p>
                </td>
                <td className="px-5 py-3">{statusBadgeFor(item.daysRemaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatCards({ stats, labels }: { stats: DomainStats; labels: { total: string; active: string; expiringSoon: string; expired: string } }) {
  const cards = [
    { label: labels.total, value: stats.total, icon: ShieldCheck, accent: "text-ink bg-ink/5 border-ink/10" },
    {
      label: labels.active,
      value: stats.active,
      icon: ShieldCheck,
      accent: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
    },
    {
      label: labels.expiringSoon,
      value: stats.expiringSoon,
      icon: TimerReset,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: labels.expired,
      value: stats.expired,
      icon: AlertTriangle,
      accent: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
    },
    ...(stats.extraLabel
      ? [{ label: stats.extraLabel, value: stats.extraValue || 0, icon: RefreshCw, accent: "text-accent bg-accent/5 border-accent/20" }]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="h-full">
          <CardContent className="flex items-start justify-between h-full">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5 leading-snug min-h-[2rem]">
                {c.label}
              </p>
              <p className="font-display text-2xl font-semibold text-ink dark:text-slate-100 font-mono">{c.value}</p>
            </div>
            <div className={`h-9 w-9 rounded flex items-center justify-center border shrink-0 ${c.accent}`}>
              <c.icon className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardTabs({
  certificate,
  personnel,
  project,
  equipment,
  chartData,
  trendData,
}: {
  certificate: { stats: DomainStats; upcoming: UpcomingItem[] };
  personnel: { stats: DomainStats; upcoming: UpcomingItem[] };
  project: { stats: DomainStats; upcoming: UpcomingItem[] };
  equipment: { stats: DomainStats; upcoming: UpcomingItem[] };
  chartData: { name: string; total: number }[];
  trendData: { month: string; total: number }[];
}) {
  const [tab, setTab] = useState<"certificate" | "personnel" | "project" | "equipment">("certificate");

  const TABS = [
    { value: "certificate" as const, label: "Certificate", icon: FileBadge2 },
    { value: "personnel" as const, label: "Personnel", icon: UserSquare2 },
    { value: "project" as const, label: "Project", icon: FolderClock },
    { value: "equipment" as const, label: "Equipment", icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.value
                ? "bg-ink text-white dark:bg-slate-100 dark:text-ink"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "certificate" && (
        <div className="space-y-6">
          <StatCards
            stats={certificate.stats}
            labels={{
              total: "Total Sertifikat",
              active: "Sertifikat Aktif",
              expiringSoon: "Berakhir < 30 Hari",
              expired: "Expired",
            }}
          />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <UpcomingTable items={certificate.upcoming} emptyText="Tidak ada sertifikat yang perlu diperhatikan saat ini." viewAllHref="/certificate" />
            </div>
            <Card className="lg:col-span-2">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-display font-semibold text-ink dark:text-slate-100 text-base">Sertifikat per Kategori</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribusi jumlah sertifikat</p>
              </div>
              <CardContent>
                <CategoryChart data={chartData} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-semibold text-ink dark:text-slate-100 text-base">Tren Sertifikat Akan Berakhir</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jumlah sertifikat yang berakhir per bulan, 12 bulan ke depan</p>
            </div>
            <CardContent>
              <MonthlyTrendChart data={trendData} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "personnel" && (
        <div className="space-y-6">
          <StatCards
            stats={personnel.stats}
            labels={{
              total: "Total Sertifikasi",
              active: "Sertifikasi Aktif",
              expiringSoon: "Berakhir < 30 Hari",
              expired: "Expired",
            }}
          />
          <UpcomingTable items={personnel.upcoming} emptyText="Tidak ada sertifikasi personil yang perlu diperhatikan saat ini." viewAllHref="/personnel-certifications" />
        </div>
      )}

      {tab === "project" && (
        <div className="space-y-6">
          <StatCards
            stats={project.stats}
            labels={{
              total: "Project Berjalan",
              active: "Aman (>30 Hari)",
              expiringSoon: "Target < 30 Hari",
              expired: "Terlambat",
            }}
          />
          <UpcomingTable items={project.upcoming} emptyText="Tidak ada project yang perlu diperhatikan saat ini." viewAllHref="/projects" />
        </div>
      )}

      {tab === "equipment" && (
        <div className="space-y-6">
          <StatCards
            stats={equipment.stats}
            labels={{
              total: "Total Alat",
              active: "Kalibrasi Aktif",
              expiringSoon: "Jatuh Tempo < 30 Hari",
              expired: "Terlambat Kalibrasi",
            }}
          />
          <UpcomingTable items={equipment.upcoming} emptyText="Tidak ada alat yang perlu diperhatikan saat ini." viewAllHref="/equipment" />
        </div>
      )}
    </div>
  );
}
