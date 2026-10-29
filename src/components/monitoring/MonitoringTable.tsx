"use client";

import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { filterGroupClass, toolbarClass } from "@/components/ui/Toolbar";
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
      <div className={toolbarClass}>
        <div className={filterGroupClass}>
          <div>
            <SearchPopoverButton value={search} onChange={setSearch} label="Cari permohonan" placeholder="Nomor, klien, atau layanan..." />
          </div>
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">Semua status</option>
            <option value="BERJALAN">Berjalan</option>
            <option value="SELESAI">Selesai</option>
            <option value="BERHENTI">Berhenti</option>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExport} isLoading={exporting}>
          <FileSpreadsheet className="h-4 w-4" />
          Ekspor Excel
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="th-row">
                <th className="px-4 py-3 font-medium">Nomor</th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">Layanan</th>
                <th className="px-4 py-3 font-medium">Tahap saat ini</th>
                <th className="px-4 py-3 font-medium text-right">Hari di tahap ini</th>
                <th className="px-4 py-3 font-medium text-right">Total hari</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Nilai kontrak</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
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
