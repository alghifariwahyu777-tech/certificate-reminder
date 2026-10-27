"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Save, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { WEEKDAY_LABEL } from "@/lib/week";

export type WeeklySettings = {
  weeklyReportEnabled: boolean;
  weeklyReportRecipients: string;
  weeklyReportDay: number;
  picUpdateRequestEnabled: boolean;
  picUpdateRequestDay: number;
};

export function WeeklyReportSettingsForm({ canManage, initial }: { canManage: boolean; initial: WeeklySettings }) {
  const { showToast } = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(kind: string, url: string, method: string, body?: unknown, ok?: string) {
    setError(null);
    setBusy(kind);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.message || "Gagal.");
      showToast(ok || "Berhasil.");
      return data;
    } finally {
      setBusy(null);
    }
  }

  const days = Object.entries(WEEKDAY_LABEL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Mingguan & Update PIC</CardTitle>
        <p className="text-xs text-slate-500 mt-1">Dikirim otomatis oleh job harian (sekitar pukul 08.00 WIB) pada hari yang dipilih.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-200">
            <input type="checkbox" disabled={!canManage} className="h-4 w-4 rounded border-slate-300" checked={v.weeklyReportEnabled} onChange={(e) => setV((s) => ({ ...s, weeklyReportEnabled: e.target.checked }))} />
            Kirim laporan mingguan manajemen
          </label>
          <div>
            <Label htmlFor="wr-to">Penerima laporan</Label>
            <Textarea
              id="wr-to"
              rows={3}
              disabled={!canManage}
              value={v.weeklyReportRecipients}
              onChange={(e) => setV((s) => ({ ...s, weeklyReportRecipients: e.target.value }))}
              placeholder="kepala.divisi@sucofindo.co.id, manager@sucofindo.co.id"
            />
            <p className="mt-1 text-xs text-slate-500">Pisahkan dengan koma atau baris baru.</p>
          </div>
          <div className="max-w-[12rem]">
            <Label htmlFor="wr-day">Hari kirim</Label>
            <Select id="wr-day" disabled={!canManage} value={v.weeklyReportDay} onChange={(e) => setV((s) => ({ ...s, weeklyReportDay: Number(e.target.value) }))}>
              {days.map(([d, l]) => (
                <option key={d} value={d}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/projects/weekly-report">
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
                Pratinjau
              </Button>
            </Link>
            {canManage && (
              <>
                <Button size="sm" variant="outline" isLoading={busy === "self"} onClick={() => call("self", "/api/weekly-report/send", "POST", { target: "self" }, "Laporan uji dikirim ke email Anda.")}>
                  <Send className="h-4 w-4" />
                  Kirim uji ke saya
                </Button>
                <Button size="sm" variant="outline" isLoading={busy === "all"} onClick={() => call("all", "/api/weekly-report/send", "POST", { target: "recipients" }, "Laporan dikirim ke semua penerima.")}>
                  <Send className="h-4 w-4" />
                  Kirim ke penerima sekarang
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
          <label className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-200">
            <input type="checkbox" disabled={!canManage} className="h-4 w-4 rounded border-slate-300" checked={v.picUpdateRequestEnabled} onChange={(e) => setV((s) => ({ ...s, picUpdateRequestEnabled: e.target.checked }))} />
            Kirim email permintaan update progres ke PIC
          </label>
          <p className="text-xs text-slate-500">
            Satu email per PIC berisi semua project berjalannya, masing-masing dengan link update tanpa login. Atur hari ini sebelum hari laporan agar laporan memakai data terbaru.
          </p>
          <div className="max-w-[12rem]">
            <Label htmlFor="pu-day">Hari kirim</Label>
            <Select id="pu-day" disabled={!canManage} value={v.picUpdateRequestDay} onChange={(e) => setV((s) => ({ ...s, picUpdateRequestDay: Number(e.target.value) }))}>
              {days.map(([d, l]) => (
                <option key={d} value={d}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          {canManage && (
            <Button size="sm" variant="outline" isLoading={busy === "pic"} onClick={() => call("pic", "/api/pic-update-request/send", "POST", undefined, "Permintaan update dikirim (yang belum menerima minggu ini).")}>
              <Send className="h-4 w-4" />
              Kirim permintaan update sekarang
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-signal-expired">{error}</p>}
        {canManage && (
          <div className="flex justify-end">
            <Button isLoading={busy === "save"} onClick={() => call("save", "/api/settings/weekly-report", "PUT", v, "Pengaturan disimpan.")}>
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
