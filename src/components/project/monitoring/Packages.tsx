"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Layers, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { InfoTip } from "@/components/ui/InfoTip";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, formatRupiah, type ProjectHealth } from "@/lib/project-monitoring-shared";
import { PACKAGE_DOC_LABEL, PACKAGE_DOC_TYPES, PACKAGE_STATUS_LABEL, packageDocument } from "@/lib/project-packages";
import { cn } from "@/lib/utils";
import { DeleteButton, EMPTY_FILE, FileLink, FileUploadField, FormError, fmtDate, useMonitoringApi } from "./shared";
import type { PackageDTO, ProjectMonitoringDTO } from "./types";

// ---------------------------------------------------------------------------
// helpers used by the other panels
// ---------------------------------------------------------------------------

/** The package a new item goes to: the package being viewed, or the only one. */
export function defaultPackageId(data: ProjectMonitoringDTO): string | null {
  if (!data.usePackages) return null;
  return data.activePackageId ?? (data.packages.length === 1 ? data.packages[0].id : null);
}

/** "Paket" select in the forms of activities, terms, RAB lines and costs (only when the project uses packages). */
export function PackageField({ data, value, onChange, id = "pkg-field" }: { data: ProjectMonitoringDTO; value: string | null | undefined; onChange: (v: string | null) => void; id?: string }) {
  if (!data.usePackages) return null;
  return (
    <div>
      <Label htmlFor={id}>Paket pekerjaan</Label>
      <Select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Belum ditautkan ke paket</option>
        {data.packages.map((p) => (
          <option key={p.id} value={p.id}>
            Paket {p.sequence}, {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Small "Paket 2" label next to an item in the whole-project view. */
export function PackageTag({ data, id }: { data: ProjectMonitoringDTO; id: string | null }) {
  if (!data.usePackages || data.activePackageId) return null;
  const p = data.packages.find((x) => x.id === id);
  return (
    <span className={cn("ml-1.5 inline-block rounded px-1.5 py-px text-[10.5px] font-semibold", p ? "bg-[#EEF5FB] text-brand-blueDark dark:bg-slate-800 dark:text-slate-200" : "bg-[#FBF3E4] text-[#9A6412]")} title={p ? `Paket ${p.sequence}, ${p.name}` : "Belum ditautkan ke paket"}>
      {p ? `Paket ${p.sequence}` : "Tanpa paket"}
    </span>
  );
}

function usePackageNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (id: string | null) => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.push(`${pathname}${id ? `?paket=${id}` : ""}${hash}`, { scroll: false });
  };
}

// ---------------------------------------------------------------------------
// switcher above the monitoring tabs
// ---------------------------------------------------------------------------

export function PackageSwitcher({ data }: { data: ProjectMonitoringDTO }) {
  const go = usePackageNav();
  if (!data.usePackages || data.packages.length === 0) return null;
  const active = data.packages.find((p) => p.id === data.activePackageId) ?? null;
  const row = data.packageRows.find((r) => r.id === data.activePackageId);
  return (
    <div className="mb-4 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
          <Layers className="h-4 w-4" aria-hidden />
          Tampilkan:
        </span>
        <Chip on={!active} onClick={() => go(null)}>
          Keseluruhan project
        </Chip>
        {data.packages.map((p) => {
          const r = data.packageRows.find((x) => x.id === p.id);
          return (
            <Chip key={p.id} on={active?.id === p.id} onClick={() => go(p.id)} dot={r?.health as ProjectHealth | undefined}>
              Paket {p.sequence}
              <span className="hidden font-normal sm:inline">, {p.name}</span>
            </Chip>
          );
        })}
      </div>
      {active && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#EEF5FB] px-3 py-2 text-[12.5px] dark:bg-slate-800">
          <p className="text-slate-700 dark:text-slate-200">
            <strong className="text-ink dark:text-slate-100">
              Paket {active.sequence}, {active.name}
            </strong>{" "}
            ({packageDocument(active)}), nilai {formatRupiah(active.value, true)}, {active.startDate ? `${fmtDate(active.startDate)} sampai ` : "sampai "}
            {fmtDate(active.endDate)}. Semua angka, Gantt, kurva S, biaya, dan termin di bawah hanya untuk paket ini.
          </p>
          {row && <span className={cn("stamp-badge", HEALTH_BADGE_CLASS[row.health as ProjectHealth])}>{HEALTH_LABEL[row.health as ProjectHealth]}</span>}
        </div>
      )}
    </div>
  );
}

const DOT: Record<string, string> = { KRITIS: "bg-signal-expired", WASPADA: "bg-signal-soon", ON_TRACK: "bg-signal-active", SELESAI: "bg-accent", BATAL: "bg-slate-400" };

function Chip({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-[16rem] items-center gap-1.5 truncate rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors",
        on ? "border-brand-blueDark bg-brand-blueDark text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900" : "border-line text-slate-600 hover:bg-paper dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {dot && <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT[dot])} aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// overview of every package (Ringkasan, whole project)
// ---------------------------------------------------------------------------

export function PackageOverview({ data }: { data: ProjectMonitoringDTO }) {
  const go = usePackageNav();
  if (!data.usePackages || data.activePackageId || data.packageRows.length === 0) return null;
  const u = data.unassigned;
  const loose = u ? u.activities + u.terms + u.costs + u.budget : 0;
  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            Pemantauan per paket
            <InfoTip label="Keterangan pemantauan per paket" guide="paket">
              Setiap paket dihitung sendiri dari kegiatan, termin, RAB, dan biaya yang ditautkan kepadanya. Angka project adalah gabungan semua paket. Klik baris untuk membuka
              Gantt, kurva S, dan keuangan paket itu.
            </InfoTip>
          </span>
        }
        description={`${data.packageRows.length} paket, total nilai ${formatRupiah(
          data.packageRows.filter((r) => r.status !== "CANCELLED").reduce((s, r) => s + (r.value ?? 0), 0),
          true
        )}`}
      />
      <CardContent className="p-0">
        {loose > 0 && (
          <div className="px-5 pb-3">
            <Notice tone="warning">
              Ada data yang belum ditautkan ke paket ({[u!.activities && `${u!.activities} kegiatan`, u!.terms && `${u!.terms} termin`, u!.budget && `${u!.budget} baris RAB`, u!.costs && `${u!.costs} biaya`].filter(Boolean).join(", ")}). Data itu masuk angka project tetapi tidak masuk
              paket mana pun. Ubah datanya dan pilih paketnya.
            </Notice>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="th-row">
                <th className="px-5 py-2.5">Paket</th>
                <th className="px-3 py-2.5 text-right">Nilai</th>
                <th className="px-3 py-2.5">Periode</th>
                <th className="px-3 py-2.5 text-right">Progres</th>
                <th className="px-3 py-2.5 text-right">Deviasi</th>
                <th className="px-3 py-2.5 text-right">Proyeksi margin</th>
                <th className="px-3 py-2.5 text-right">PAD</th>
                <th className="px-3 py-2.5">Kondisi</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.packageRows.map((r) => (
                <tr key={r.id} onClick={() => go(r.id)} className="cursor-pointer border-t border-line/70 hover:bg-paper dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold text-ink dark:text-slate-100">
                      Paket {r.sequence}, {r.name}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                      {packageDocument(r)}, {r.counts.activities} kegiatan
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatRupiah(r.value, true)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">
                    {r.startDate ? fmtDate(r.startDate) : "-"} sampai {fmtDate(r.endDate)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className="font-semibold text-ink dark:text-slate-100">{formatPercent(r.actualPercent)}</span>
                    <span className="block whitespace-nowrap text-[11px] text-slate-500">rencana {formatPercent(r.plannedPercent)}</span>
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-semibold tabular-nums", r.deviation < -0.05 ? "text-signal-expired" : "text-signal-active")}>
                    {r.deviation > 0 ? "+" : r.deviation < 0 ? "−" : ""}
                    {Math.abs(r.deviation).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", r.forecastMarginPct !== null && r.targetMarginPct !== null && r.forecastMarginPct < r.targetMarginPct - 1 ? "font-semibold text-signal-expired" : "")}>
                    {r.forecastMarginPct === null ? <span className="text-slate-400">belum ada RAB</span> : formatPercent(r.forecastMarginPct)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatRupiah(r.pad, true)}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("stamp-badge", HEALTH_BADGE_CLASS[r.health as ProjectHealth])}>{HEALTH_LABEL[r.health as ProjectHealth]}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// manage packages (Dokumen tab)
// ---------------------------------------------------------------------------

type PkgForm = Omit<PackageDTO, "id" | "value" | "sequence"> & { value: string; sequence: string };

const toForm = (p: PackageDTO | null, next: number): PkgForm =>
  p
    ? { ...p, value: p.value === null ? "" : String(p.value), sequence: String(p.sequence) }
    : { name: "", docType: "SPK", docNumber: null, issueDate: null, value: "", startDate: null, endDate: "", actualEndDate: null, status: "ONGOING", notes: null, sequence: String(next), ...EMPTY_FILE };

export function PackageManager({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PackageDTO | null>(null);
  const [form, setForm] = useState<PkgForm>(toForm(null, 1));
  const [error, setError] = useState<string | null>(null);
  const canEdit = data.rights.project;
  const base = `/api/projects/${data.projectId}/packages`;

  function openForm(p: PackageDTO | null) {
    setEditing(p);
    setForm(toForm(p, (data.packages.at(-1)?.sequence ?? 0) + 1));
    setError(null);
    setOpen(true);
  }
  const set = <K extends keyof PkgForm>(k: K, v: PkgForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) return setError("Nama paket wajib diisi.");
    if (!form.endDate) return setError("Target selesai paket wajib diisi.");
    const body = { ...form, value: form.value === "" ? null : Number(form.value), sequence: form.sequence === "" ? undefined : Number(form.sequence) };
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, body, "Paket diperbarui.") : await send("POST", base, body, "Paket ditambahkan.");
    if (err) setError(err);
    else setOpen(false);
  }

  async function toggle(enabled: boolean) {
    await send("PUT", `${base}/activate`, { enabled }, enabled ? "Paket pekerjaan diaktifkan." : "Paket pekerjaan dinonaktifkan.");
  }

  if (!data.usePackages) {
    return (
      <Card>
        <CardHead title="Paket pekerjaan" description="Untuk project dengan kontrak induk dan beberapa kontrak turunan: SPK, PO, surat pesanan, atau work order." />
        <CardContent>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-slate-600 dark:text-slate-300">
            <li>Setiap paket punya nomor dokumen, nilai, periode, dan status sendiri.</li>
            <li>Kegiatan, termin, RAB, dan biaya ditautkan ke paket, sehingga Gantt, kurva S, progres, margin, dan PAD terpantau per paket.</li>
            <li>Nilai kontrak dan periode project menjadi jumlah semua paket.</li>
            <li>Saat diaktifkan, kontrak saat ini menjadi Paket 1 dan semua data yang ada otomatis ditautkan ke Paket 1.</li>
          </ul>
          {canEdit ? (
            <Button onClick={() => toggle(true)} isLoading={busy}>
              <Layers className="h-4 w-4" />
              Aktifkan paket pekerjaan
            </Button>
          ) : (
            <p className="text-[13px] text-slate-500">Paket pekerjaan belum diaktifkan untuk project ini.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        title="Paket pekerjaan"
        description="Nilai kontrak dan periode project dihitung dari semua paket kecuali yang batal."
        action={
          canEdit ? (
            <Button size="sm" onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" />
              Tambah paket
            </Button>
          ) : undefined
        }
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="th-row">
                <th className="px-5 py-2.5">Paket</th>
                <th className="px-3 py-2.5">Dokumen</th>
                <th className="px-3 py-2.5 text-right">Nilai</th>
                <th className="px-3 py-2.5">Periode</th>
                <th className="px-3 py-2.5">Status</th>
                {canEdit && <th className="px-5 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {data.packages.map((p) => (
                <tr key={p.id} className="border-t border-line/70 align-top dark:border-slate-800">
                  <td className="px-5 py-2.5">
                    <p className="font-semibold text-ink dark:text-slate-100">
                      Paket {p.sequence}, {p.name}
                    </p>
                    {p.notes && <p className="text-[11.5px] text-slate-500">{p.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{packageDocument(p)}</p>
                    {p.issueDate && <p className="text-[11.5px] text-slate-500">Terbit {fmtDate(p.issueDate)}</p>}
                    <FileLink url={p.fileUrl} label="Dokumen" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatRupiah(p.value, true)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {p.startDate ? fmtDate(p.startDate) : "-"} sampai {fmtDate(p.endDate)}
                  </td>
                  <td className="px-3 py-2.5">{PACKAGE_STATUS_LABEL[p.status] ?? p.status}</td>
                  {canEdit && (
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label={`Ubah paket ${p.sequence}`} onClick={() => openForm(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {data.packages.length > 1 && <DeleteButton what={`paket ${p.sequence}`} onConfirm={() => send("DELETE", `${base}/${p.id}`, undefined, "Paket dihapus.")} />}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="border-t border-line px-5 py-3 text-[12.5px] text-slate-500 dark:border-slate-800">
            Project tidak lagi dibagi per paket?{" "}
            <button type="button" onClick={() => toggle(false)} className="font-semibold text-accent hover:underline">
              Nonaktifkan paket pekerjaan
            </button>
            . Data paket tetap tersimpan dan kembali bila diaktifkan lagi.
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? `Ubah paket ${editing.sequence}` : "Tambah paket pekerjaan"} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <div>
              <Label htmlFor="pk-seq">Urutan</Label>
              <Input id="pk-seq" type="number" min={1} value={form.sequence} onChange={(e) => set("sequence", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pk-name">Nama paket</Label>
              <Input id="pk-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Misalnya Survey Blok A" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_11rem]">
            <div>
              <Label htmlFor="pk-type">Jenis dokumen</Label>
              <Select id="pk-type" value={form.docType} onChange={(e) => set("docType", e.target.value)}>
                {PACKAGE_DOC_TYPES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pk-no">Nomor {PACKAGE_DOC_LABEL[form.docType] ?? "dokumen"}</Label>
              <Input id="pk-no" value={form.docNumber ?? ""} onChange={(e) => set("docNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pk-issue">Tanggal terbit</Label>
              <Input id="pk-issue" type="date" value={form.issueDate ?? ""} onChange={(e) => set("issueDate", e.target.value || null)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="pk-value">Nilai (Rp)</Label>
              <Input id="pk-value" type="number" min={0} step="any" inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pk-start">Tanggal mulai</Label>
              <Input id="pk-start" type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || null)} />
            </div>
            <div>
              <Label htmlFor="pk-end">Target selesai</Label>
              <Input id="pk-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pk-status">Status</Label>
              <Select id="pk-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(PACKAGE_STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {form.status === "COMPLETED" && (
              <div>
                <Label htmlFor="pk-done">Tanggal selesai aktual</Label>
                <Input id="pk-done" type="date" value={form.actualEndDate ?? ""} onChange={(e) => set("actualEndDate", e.target.value || null)} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="pk-notes">Catatan</Label>
            <Textarea id="pk-notes" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <FileUploadField label="Dokumen paket (opsional)" value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }} onChange={(v) => setForm((f) => ({ ...f, ...v }))} />
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button isLoading={busy} onClick={save}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
