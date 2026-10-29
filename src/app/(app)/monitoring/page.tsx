import { CheckCircle2, Timer, TrendingUp, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { getMonitoringRows } from "@/lib/monitoring";
import { MonitoringTable } from "@/components/monitoring/MonitoringTable";
import { StatCard, StatGrid } from "@/components/ui/Stat";
import { PageBody } from "@/components/layout/PageBody";
import { formatRupiah as formatRupiahShort } from "@/lib/project-monitoring-shared";

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

  const runningCount = rows.filter((r) => r.overallState === "BERJALAN").length;

  return (
    <>
      <Navbar
        title="Monitoring Permohonan"
        subtitle="Proses dan nilai kontrak permohonan"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <StatGrid>
          <StatCard icon={Wallet} label="Total nilai kontrak" value={formatRupiahShort(totalContractValue, true)} hint={formatRupiah(totalContractValue)} sub={`${rows.length} permohonan`} />
          <StatCard icon={TrendingUp} label="Nilai kontrak berjalan" value={formatRupiahShort(runningContractValue, true)} hint={formatRupiah(runningContractValue)} tone="accent" sub={`${runningCount} permohonan dalam proses`} />
          <StatCard icon={CheckCircle2} label="Nilai kontrak selesai" value={formatRupiahShort(completedContractValue, true)} hint={formatRupiah(completedContractValue)} tone={completedContractValue ? "good" : "default"} sub={`${completedRows.length} permohonan selesai`} />
          <StatCard icon={Timer} label="Rata-rata lama proses" value={`${avgDays} hari`} sub="Dari permohonan sampai sertifikat terbit" />
        </StatGrid>

        <MonitoringTable initialRows={rows} />
      </PageBody>
    </>
  );
}
