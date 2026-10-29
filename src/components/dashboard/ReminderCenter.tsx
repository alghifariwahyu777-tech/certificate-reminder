"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, XCircle, MinusCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type EmailLogItem = {
  id: string;
  certificateNumber: string;
  certificateName: string;
  milestoneDays: number;
  status: "SENT" | "FAILED" | "SKIPPED";
  recipient: string;
  sentAt: string;
};

type RunDetail = {
  certificateNumber: string;
  certificateName: string;
  milestoneDays: number;
  label?: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  errorMessage?: string;
};

const STATUS_ICON = { SENT: CheckCircle2, FAILED: XCircle, SKIPPED: MinusCircle };
const STATUS_COLOR = {
  SENT: "text-signal-active",
  FAILED: "text-signal-expired",
  SKIPPED: "text-slate-400",
};

export function ReminderCenter({
  pendingCount,
  emailConfigured,
  recentLogs,
}: {
  pendingCount: number;
  emailConfigured: boolean;
  recentLogs: EmailLogItem[];
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunDetail[] | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<{ sent: number; failed: number; skipped: number } | null>(
    null
  );

  async function handleRun() {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/reminders/run", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal mengirim pengingat.", "error");
        return;
      }
      setLastRun(body.summary.details);
      setLastRunSummary({
        sent: body.summary.sent,
        failed: body.summary.failed,
        skipped: body.summary.skipped,
      });
      router.refresh();
      if (body.summary.checked === 0) {
        showToast("Tidak ada data yang jatuh pada jadwal pengingat hari ini.");
      } else {
        showToast(
          `Pengingat selesai dikirim: ${body.summary.sent} terkirim, ${body.summary.failed} gagal, ${body.summary.skipped} dilewati.`
        );
      }
    } catch {
      showToast("Gagal mengirim pengingat.", "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHead
        title="Pengingat email"
        description="Email otomatis untuk sertifikat, sertifikasi personil, project, dan kalibrasi alat"
        action={
          <>
            <a href="/api/reminders/preview" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                Lihat contoh email
              </Button>
            </a>
            <Button size="sm" onClick={handleRun} isLoading={running}>
              <Send className="h-4 w-4" />
              Kirim pengingat sekarang
            </Button>
          </>
        }
      />
      <CardContent className="space-y-4">
        {!emailConfigured && (
          <Notice tone="warning" title="Pengiriman email belum diaktifkan">
            Isi GMAIL_USER dan GMAIL_APP_PASSWORD pada konfigurasi server. Sebelum itu, pengingat hanya dicatat dan tidak terkirim.
          </Notice>
        )}

        <p className="text-sm text-slate-600">
          <strong className="text-ink">{pendingCount} data</strong> dijadwalkan menerima pengingat hari ini dan belum dikirimi email. Pengingat dikirim 90, 60, 30, 14, 7, 3, 1, dan 0 hari sebelum tanggal berakhir.
        </p>

        {lastRun && (
          <div className="rounded border border-slate-200 divide-y divide-slate-100">
            <div className="px-3 py-2 bg-slate-50/60 flex items-center gap-4 text-xs text-slate-500">
              <span>Hasil pengiriman terakhir:</span>
              <span className="text-signal-active">{lastRunSummary?.sent} terkirim</span>
              <span className="text-signal-expired">{lastRunSummary?.failed} gagal</span>
              <span className="text-slate-400">{lastRunSummary?.skipped} dilewati</span>
            </div>
            {lastRun.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400">Tidak ada data yang jatuh pada jadwal pengingat hari ini.</p>
            ) : (
              lastRun.map((d, i) => {
                const Icon = STATUS_ICON[d.status];
                return (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLOR[d.status]}`} />
                    <span className="text-ink font-medium truncate">{d.certificateName}</span>
                    <span className="text-slate-400 shrink-0">{d.label ?? `H-${d.milestoneDays}`}</span>
                    {d.errorMessage && <span className="text-slate-500 truncate">{d.errorMessage}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {recentLogs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Riwayat pengiriman terakhir</p>
            <div className="rounded border border-slate-200 divide-y divide-slate-100">
              {recentLogs.map((log) => {
                const Icon = STATUS_ICON[log.status];
                return (
                  <div key={log.id} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLOR[log.status]}`} />
                    <span className="text-ink truncate flex-1">{log.certificateName}</span>
                    <span className="text-slate-400 shrink-0">H-{log.milestoneDays}</span>
                    <span className="text-slate-400 shrink-0">{formatDate(log.sentAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
