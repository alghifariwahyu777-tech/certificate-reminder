"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Mail, CheckCircle2, XCircle, MinusCircle, Loader2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
        showToast(body.message || "Gagal menjalankan reminder.", "error");
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
        showToast("Tidak ada sertifikat yang jatuh pada milestone reminder hari ini.");
      } else {
        showToast(
          `Reminder selesai: ${body.summary.sent} terkirim, ${body.summary.failed} gagal, ${body.summary.skipped} dilewati.`
        );
      }
    } catch {
      showToast("Gagal menjalankan reminder.", "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" />
          <CardTitle>Reminder Email</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reminders/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Lihat Contoh Template
          </a>
          <Button size="sm" onClick={handleRun} isLoading={running}>
            <Send className="h-4 w-4" />
            Kirim Reminder Sekarang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailConfigured && (
          <div className="rounded border border-signal-soonBorder bg-signal-soonBg px-3 py-2.5 text-xs text-signal-soon">
            <strong>GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi.</strong> Menjalankan reminder akan tetap mencatat
            log (mode simulasi) tapi tidak benar-benar mengirim email. Lihat README untuk cara mengaktifkan.
          </div>
        )}

        <p className="text-sm text-slate-600">
          <strong className="text-ink font-mono">{pendingCount}</strong> item (sertifikat/sertifikasi/project/alat)
          sedang berada
          tepat pada milestone reminder (90/60/30/14/7/3/1/0 hari) dan belum dikirimi email hari ini.
        </p>

        {lastRun && (
          <div className="rounded border border-slate-200 divide-y divide-slate-100">
            <div className="px-3 py-2 bg-slate-50/60 flex items-center gap-4 text-xs font-mono text-slate-500">
              <span>Hasil run terakhir:</span>
              <span className="text-signal-active">{lastRunSummary?.sent} terkirim</span>
              <span className="text-signal-expired">{lastRunSummary?.failed} gagal</span>
              <span className="text-slate-400">{lastRunSummary?.skipped} dilewati</span>
            </div>
            {lastRun.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400">Tidak ada sertifikat yang cocok milestone hari ini.</p>
            ) : (
              lastRun.map((d, i) => {
                const Icon = STATUS_ICON[d.status];
                return (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLOR[d.status]}`} />
                    <span className="text-ink font-medium truncate">{d.certificateName}</span>
                    <span className="text-slate-400 font-mono shrink-0">H-{d.milestoneDays}</span>
                    {d.errorMessage && <span className="text-slate-400 truncate">— {d.errorMessage}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {recentLogs.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Log Terbaru</p>
            <div className="rounded border border-slate-200 divide-y divide-slate-100">
              {recentLogs.map((log) => {
                const Icon = STATUS_ICON[log.status];
                return (
                  <div key={log.id} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLOR[log.status]}`} />
                    <span className="text-ink truncate flex-1">{log.certificateName}</span>
                    <span className="text-slate-400 font-mono shrink-0">H-{log.milestoneDays}</span>
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
