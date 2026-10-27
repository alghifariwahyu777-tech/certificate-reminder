"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { MonitoringThresholds } from "@/lib/project-monitoring-shared";

export function ProjectMonitoringSettingsForm({ canManage, initial }: { canManage: boolean; initial: MonitoringThresholds }) {
  const { showToast } = useToast();
  const [v, setV] = useState({
    projectDeviationWarning: String(initial.deviationWarning),
    projectDeviationCritical: String(initial.deviationCritical),
    projectProgressStaleDays: String(initial.progressStaleDays),
    projectInvoiceOverdueDays: String(initial.invoiceOverdueDays),
    projectMarginDropAlert: String(initial.marginDropAlert),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/project-monitoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.message || "Gagal menyimpan.");
      showToast("Ambang monitoring project disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof v, label: string, hint: string, suffix: string) => (
    <div>
      <Label htmlFor={key}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={key} type="number" min={0} step="any" disabled={!canManage} value={v[key]} onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))} />
        <span className="text-sm text-slate-500 whitespace-nowrap">{suffix}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitoring Project</CardTitle>
        <p className="text-xs text-slate-500 mt-1">Ambang untuk status kesehatan project dan reminder realisasi harian.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {field("projectDeviationWarning", "Ambang Waspada", "Terlambat dari rencana sebesar ini → Waspada.", "poin %")}
          {field("projectDeviationCritical", "Ambang Kritis", "Terlambat sebesar ini → Kritis + email ke PIC.", "poin %")}
          {field("projectProgressStaleDays", "Progres tidak diperbarui", "Kirim pengingat update progres setelah sekian hari.", "hari")}
          {field("projectInvoiceOverdueDays", "Invoice tanpa jatuh tempo", "Dianggap telat setelah sekian hari sejak tgl invoice.", "hari")}
          {field("projectMarginDropAlert", "Margin tergerus", "Margin aktual/prakiraan turun sebesar ini dari rencana → masuk laporan sebagai hal yang perlu keputusan.", "poin %")}
        </div>
        {error && <p className="text-sm text-signal-expired">{error}</p>}
        {canManage && (
          <div className="flex justify-end">
            <Button onClick={save} isLoading={saving}>
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
