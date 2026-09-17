"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileSpreadsheet } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { MonitoringRow } from "@/lib/monitoring";

const STATE_LABELS: Record<MonitoringRow["overallState"], string> = {
  BERJALAN: "Berjalan",
  SELESAI: "Selesai",
  BERHENTI: "Berhenti",
};
const STATE_COLORS: Record<MonitoringRow["overallState"], string> = {
  BERJALAN: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
  SELESAI: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  BERHENTI: "text-slate-500 bg-slate-100 border-slate-200",
};

function formatRupiah(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value
  );
}

export function MonitoringTable({ initialRows }: { initialRows: MonitoringRow[] }) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRows.filter((r) => {
      const matchesSearch =
        !q ||
        r.applicationNumber.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q);
      const matchesState = !stateFilter || r.overallState === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [initialRows, search, stateFilter]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export?type=monitoring&format=xlsx");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nomor, klien, atau layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="sm:w-48">
            <option value="">Semua Status</option>
            <option value="BERJALAN">Berjalan</option>
            <option value="SELESAI">Selesai</option>
            <option value="BERHENTI">Berhenti</option>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExport} isLoading={exporting}>
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-medium">Nomor</th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">Layanan</th>
                <th className="px-4 py-3 font-medium">Tahap Saat Ini</th>
                <th className="px-4 py-3 font-medium text-right">Hari di Tahap Ini</th>
                <th className="px-4 py-3 font-medium text-right">Total Hari</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Nilai Kontrak</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada permohonan yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/applications/${r.id}`} className="font-mono text-xs text-accent hover:text-accent-light">
                        {r.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{r.clientName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.serviceName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.currentStageName || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {r.daysInCurrentStage ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{r.totalDays}</td>
                    <td className="px-4 py-3">
                      <span className={`stamp-badge ${STATE_COLORS[r.overallState]}`}>
                        {STATE_LABELS[r.overallState]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{formatRupiah(r.contractValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
