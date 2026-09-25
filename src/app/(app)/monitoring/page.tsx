import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { getMonitoringRows } from "@/lib/monitoring";
import { MonitoringTable } from "@/components/monitoring/MonitoringTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Wallet, TrendingUp, CheckCircle2, Gauge } from "lucide-react";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function MonitoringPage() {
  const session = await getSession();
  const rows = await getMonitoringRows();

  const totalContractValue = rows.reduce((sum, r) => sum + (r.contractValue || 0), 0);
  const runningContractValue = rows
    .filter((r) => r.overallState === "BERJALAN")
    .reduce((sum, r) => sum + (r.contractValue || 0), 0);
  const completedContractValue = rows
    .filter((r) => r.overallState === "SELESAI")
    .reduce((sum, r) => sum + (r.contractValue || 0), 0);

  const completedRows = rows.filter((r) => r.overallState === "SELESAI");
  const avgDays =
    completedRows.length > 0
      ? Math.round(completedRows.reduce((sum, r) => sum + r.totalDays, 0) / completedRows.length)
      : 0;

  const summaryCards = [
    {
      label: "Total Nilai Kontrak",
      value: formatRupiah(totalContractValue),
      icon: Wallet,
      accent: "text-ink bg-ink/5 border-ink/10",
    },
    {
      label: "Nilai Kontrak Berjalan",
      value: formatRupiah(runningContractValue),
      icon: TrendingUp,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: "Nilai Kontrak Selesai",
      value: formatRupiah(completedContractValue),
      icon: CheckCircle2,
      accent: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
    },
    {
      label: "Rata-rata Lama Proses",
      value: `${avgDays} hari`,
      icon: Gauge,
      accent: "text-accent bg-accent/5 border-accent/20",
    },
  ];

  return (
    <>
      <Navbar
        title="Monitoring"
        subtitle="Ringkasan proses permohonan & nilai kontrak untuk manajemen"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${c.accent}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="text-lg font-semibold text-ink truncate">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <MonitoringTable initialRows={rows} />
      </div>
    </>
  );
}
