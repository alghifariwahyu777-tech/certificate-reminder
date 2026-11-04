/**
 * "Perlu tindakan" for running projects, each item tagged with the department
 * that has to act on it. Pure (no database) so the dashboard, the "Tugas saya"
 * page and the weekly report all derive the same list from the portfolio rows.
 */
import type { PortfolioRow } from "@/lib/project-monitoring";
import { formatPercent, formatRupiah } from "@/lib/project-monitoring-shared";

/** Department that owns a task. Same keys as the roles in lib/permissions.ts. */
export type TaskOwner = "PM" | "QHSE" | "HC" | "FINANCE" | "MANAGEMENT" | "ADMIN";

export const OWNER_LABEL: Record<TaskOwner, string> = {
  PM: "PM",
  QHSE: "QHSE",
  HC: "Human Capital",
  FINANCE: "Keuangan",
  MANAGEMENT: "Manajemen",
  ADMIN: "Admin",
};

export const OWNER_ORDER: TaskOwner[] = ["PM", "FINANCE", "QHSE", "HC", "MANAGEMENT", "ADMIN"];

export type Attention = {
  id: string;
  name: string;
  text: string;
  tone: "bad" | "warn";
  owner: TaskOwner;
  /** Section of the project page to open, e.g. "keuangan/termin". */
  at?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** End of the previous calendar month (UTC date-only), the period a monthly HSE report must cover. */
export function lastMonthEnd(today: number): number {
  const d = new Date(today);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0);
}

export function buildAttention(rows: PortfolioRow[], today: number = Date.now()): Attention[] {
  const prevMonthEnd = lastMonthEnd(today);
  return rows
    .filter((r) => r.status === "ONGOING" || r.closeoutComplete === false)
    .flatMap((r) => {
      const base = { id: r.id, name: r.projectName };
      if (r.closeoutComplete === false)
        return [{ ...base, tone: "warn" as const, owner: "PM" as const, text: "Project selesai, tetapi dokumen BAPP, BAST, atau laporan akhir belum lengkap.", at: "dokumen/penutupan" }];
      const s = r.summary;
      const out: Attention[] = [];
      if (s.isOverdue) out.push({ ...base, tone: "bad", owner: "PM", text: `Melewati target selesai ${Math.abs(s.daysRemaining)} hari dengan progres ${formatPercent(s.actualPercent)}.`, at: "jadwal/progres" });
      else if (s.health === "KRITIS") out.push({ ...base, tone: "bad", owner: "PM", text: s.healthReason.endsWith(".") ? s.healthReason : `${s.healthReason}.`, at: "jadwal/progres" });
      if (r.margin.signals.margin === "bad")
        out.push({ ...base, tone: "bad", owner: "PM", text: `Proyeksi margin ${formatPercent(r.margin.forecastMarginPct)}, di bawah target ${formatPercent(r.margin.targetMarginPct)}.`, at: "keuangan/margin" });
      if (s.overdueInvoiceCount)
        out.push({ ...base, tone: "bad", owner: "FINANCE", text: `${s.overdueInvoiceCount} invoice melewati jatuh tempo senilai ${formatRupiah(s.overdueInvoiceAmount, true)}.`, at: "keuangan/termin" });
      if (s.openHighIssues) out.push({ ...base, tone: "bad", owner: "PM", text: `${s.openHighIssues} kendala berdampak tinggi belum terselesaikan.`, at: "tim/kendala" });
      if (r.hse.lostTimeInjury + r.hse.fatality > 0)
        out.push({ ...base, tone: "bad", owner: "QHSE", text: `Tercatat ${r.hse.lostTimeInjury + r.hse.fatality} kecelakaan kerja dengan hilang hari kerja.`, at: "tim/hse" });
      if (r.trend !== null && r.trend <= -5) out.push({ ...base, tone: "warn", owner: "PM", text: `Deviasi memburuk ${Math.abs(r.trend).toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin dibanding minggu lalu.`, at: "jadwal/progres" });
      if (s.isStale) out.push({ ...base, tone: "warn", owner: "PM", text: `Progres belum diperbarui selama ${s.daysSinceUpdate} hari.`, at: "jadwal/progres" });
      if (s.dueUnbilledCount) out.push({ ...base, tone: "warn", owner: "FINANCE", text: `${s.dueUnbilledCount} termin sudah masuk jadwal penagihan, belum ditagih.`, at: "keuangan/termin" });
      if (!r.margin.hasBudget) out.push({ ...base, tone: "warn", owner: "FINANCE", text: "RAB belum diunggah, sehingga biaya dan margin belum dapat dipantau.", at: "keuangan/biaya" });
      const started = r.startDate ? Date.parse(r.startDate) : null;
      if (started !== null && started <= prevMonthEnd && (r.hse.lastPeriod === null || r.hse.lastPeriod < prevMonthEnd))
        out.push({ ...base, tone: "warn", owner: "QHSE", text: `Laporan HSE bulan ${new Date(prevMonthEnd).toLocaleDateString("id-ID", { month: "long", timeZone: "UTC" })} belum diisi.`, at: "tim/hse" });
      if (r.teamSize === 0 && started !== null && started <= today + 7 * DAY_MS)
        out.push({ ...base, tone: "warn", owner: "HC", text: "Belum ada personil yang ditugaskan.", at: "tim/personil" });
      return out;
    })
    .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}
