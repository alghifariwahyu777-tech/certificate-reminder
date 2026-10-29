"use client";

import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ENTITY_ICON } from "@/lib/entity-icons";
import Link from "next/link";
import { Card, CardContent, CardHead, EmptyState } from "@/components/ui/Card";
import { StatCard, StatGrid } from "@/components/ui/Stat";
import { TabNav } from "@/components/ui/TabNav";
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
  extraLabel?: string; // e.g. "Perpanjangan berjalan" (Certificate) or "Selesai" (Project)
  extraValue?: number;
};

type Labels = { total: string; active: string; expiringSoon: string; expired: string; dateColumn: string; item: string };

function statusBadgeFor(days: number, soonLabel: string, lateLabel: string) {
  if (days < 0) return <span className="stamp-badge border-signal-expiredBorder bg-signal-expiredBg text-signal-expired">{lateLabel}</span>;
  if (days <= 30) return <span className="stamp-badge border-signal-soonBorder bg-signal-soonBg text-signal-soon">{soonLabel}</span>;
  return <span className="stamp-badge border-signal-activeBorder bg-signal-activeBg text-signal-active">Aktif</span>;
}

function UpcomingTable({
  items,
  emptyText,
  viewAllHref,
  labels,
  soonLabel,
  lateLabel,
}: {
  items: UpcomingItem[];
  emptyText: string;
  viewAllHref: string;
  labels: Labels;
  soonLabel: string;
  lateLabel: string;
}) {
  return (
    <Card>
      <CardHead
        title="Perlu ditindaklanjuti"
        description="Sudah lewat atau jatuh tempo dalam 30 hari, diurutkan dari yang paling dekat"
        action={
          <Link href={viewAllHref} className="text-[13px] font-semibold text-accent hover:text-accent-light">
            Lihat semua
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="th-row">
                <th className="px-5 py-2.5">{labels.item}</th>
                <th className="px-5 py-2.5">Keterangan</th>
                <th className="px-5 py-2.5">{labels.dateColumn}</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3">
                    <Link href={item.detailHref} className="font-semibold text-ink hover:text-accent dark:text-slate-100">
                      {item.title}
                    </Link>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{item.secondary}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700 dark:text-slate-300">
                    {new Date(item.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    <p className={item.daysRemaining < 0 ? "text-xs text-signal-expired" : "text-xs text-slate-500"}>
                      {item.daysRemaining < 0 ? `Lewat ${Math.abs(item.daysRemaining)} hari` : item.daysRemaining === 0 ? "Hari ini" : `${item.daysRemaining} hari lagi`}
                    </p>
                  </td>
                  <td className="px-5 py-3">{statusBadgeFor(item.daysRemaining, soonLabel, lateLabel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Stats({ stats, labels, icon }: { stats: DomainStats; labels: Labels; icon: LucideIcon }) {
  const pct = (n: number) => (stats.total ? `${Math.round((n / stats.total) * 100)}% dari total` : "Belum ada data");
  return (
    <StatGrid cols={stats.extraLabel ? 5 : 4}>
      <StatCard icon={icon} label={labels.total} value={stats.total.toLocaleString("id-ID")} sub="Seluruh data tercatat" />
      <StatCard icon={CheckCircle2} label={labels.active} value={stats.active.toLocaleString("id-ID")} tone={stats.active ? "good" : "default"} sub={pct(stats.active)} />
      <StatCard icon={Clock} label={labels.expiringSoon} value={stats.expiringSoon.toLocaleString("id-ID")} tone={stats.expiringSoon ? "warn" : "default"} sub="Dalam 30 hari ke depan" />
      <StatCard icon={AlertTriangle} label={labels.expired} value={stats.expired.toLocaleString("id-ID")} tone={stats.expired ? "bad" : "default"} sub="Perlu tindakan segera" />
      {stats.extraLabel && <StatCard icon={RefreshCw} label={stats.extraLabel} value={(stats.extraValue || 0).toLocaleString("id-ID")} sub={stats.extraLabel === "Selesai" ? "Project yang sudah selesai" : "Sertifikat dalam proses perpanjangan"} />}
    </StatGrid>
  );
}

type TabKey = "sertifikat" | "personil" | "project" | "alat";

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
  const [tab, setTab] = useState<TabKey>("sertifikat");
  const need = (s: DomainStats) => s.expired + s.expiringSoon;

  const TABS = [
    { key: "sertifikat" as const, icon: ENTITY_ICON.certificate, label: "Sertifikat klien", badge: need(certificate.stats) },
    { key: "personil" as const, icon: ENTITY_ICON.personnelCert, label: "Sertifikasi personil", badge: need(personnel.stats) },
    { key: "project" as const, icon: ENTITY_ICON.project, label: "Project", badge: need(project.stats) },
    { key: "alat" as const, icon: ENTITY_ICON.equipment, label: "Kalibrasi alat", badge: need(equipment.stats) },
  ];

  useEffect(() => {
    const h = window.location.hash.slice(1) as TabKey;
    if (TABS.some((t) => t.key === h)) setTab(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(k: TabKey) {
    setTab(k);
    history.replaceState(null, "", `#${k}`);
  }

  return (
    <div className="space-y-5">
      <TabNav label="Jenis pengingat" tabs={TABS} value={tab} onChange={go} />

      {tab === "sertifikat" && (
        <div className="space-y-5">
          <Stats
            stats={certificate.stats}
            icon={ENTITY_ICON.certificate}
            labels={{ total: "Total sertifikat", active: "Masih berlaku", expiringSoon: "Segera berakhir", expired: "Sudah berakhir", dateColumn: "Berakhir", item: "Sertifikat" }}
          />
          <UpcomingTable
            items={certificate.upcoming}
            emptyText="Tidak ada sertifikat yang perlu ditindaklanjuti saat ini."
            viewAllHref="/certificate"
            labels={{ total: "", active: "", expiringSoon: "", expired: "", dateColumn: "Berakhir", item: "Sertifikat" }}
            soonLabel="Segera berakhir"
            lateLabel="Berakhir"
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHead title="Sertifikat per kategori" description="Jumlah sertifikat pada setiap kategori" />
              <CardContent>
                <CategoryChart data={chartData} />
              </CardContent>
            </Card>
            <Card>
              <CardHead title="Sertifikat yang akan berakhir" description="Jumlah per bulan untuk 12 bulan ke depan" />
              <CardContent>
                <MonthlyTrendChart data={trendData} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "personil" && (
        <div className="space-y-5">
          <Stats
            stats={personnel.stats}
            icon={ENTITY_ICON.personnelCert}
            labels={{ total: "Total sertifikasi", active: "Masih berlaku", expiringSoon: "Segera berakhir", expired: "Sudah berakhir", dateColumn: "Berakhir", item: "Sertifikasi" }}
          />
          <UpcomingTable
            items={personnel.upcoming}
            emptyText="Tidak ada sertifikasi personil yang perlu ditindaklanjuti saat ini."
            viewAllHref="/personnel-certifications"
            labels={{ total: "", active: "", expiringSoon: "", expired: "", dateColumn: "Berakhir", item: "Sertifikasi" }}
            soonLabel="Segera berakhir"
            lateLabel="Berakhir"
          />
        </div>
      )}

      {tab === "project" && (
        <div className="space-y-5">
          <Stats
            stats={project.stats}
            icon={ENTITY_ICON.project}
            labels={{ total: "Project berjalan", active: "Sesuai jadwal", expiringSoon: "Mendekati target", expired: "Lewat target", dateColumn: "Target selesai", item: "Project" }}
          />
          <UpcomingTable
            items={project.upcoming}
            emptyText="Tidak ada project yang perlu ditindaklanjuti saat ini."
            viewAllHref="/projects/dashboard"
            labels={{ total: "", active: "", expiringSoon: "", expired: "", dateColumn: "Target selesai", item: "Project" }}
            soonLabel="Mendekati target"
            lateLabel="Lewat target"
          />
        </div>
      )}

      {tab === "alat" && (
        <div className="space-y-5">
          <Stats
            stats={equipment.stats}
            icon={ENTITY_ICON.equipment}
            labels={{ total: "Total alat", active: "Kalibrasi berlaku", expiringSoon: "Segera dikalibrasi", expired: "Lewat jadwal", dateColumn: "Kalibrasi berikutnya", item: "Alat" }}
          />
          <UpcomingTable
            items={equipment.upcoming}
            emptyText="Tidak ada alat yang perlu ditindaklanjuti saat ini."
            viewAllHref="/equipment"
            labels={{ total: "", active: "", expiringSoon: "", expired: "", dateColumn: "Kalibrasi berikutnya", item: "Alat" }}
            soonLabel="Segera kalibrasi"
            lateLabel="Lewat jadwal"
          />
        </div>
      )}
    </div>
  );
}
