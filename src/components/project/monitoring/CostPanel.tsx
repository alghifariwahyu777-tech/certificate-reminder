"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { useState } from "react";
import { Lock, Pencil, Plus, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PROJECT_COST_CATEGORIES, formatPercent, formatRupiah } from "@/lib/project-monitoring-shared";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE } from "./shared";
import type { BudgetItemDTO, ExpenseDTO, ProjectMonitoringDTO } from "./types";
import { CostImportDialog } from "./CostImportDialog";
import { RabCard } from "./RabPanel";
import { CAUSE_LABEL } from "@/lib/project-margin";

export function CostPanel({ data }: { data: ProjectMonitoringDTO }) {
  return (
    <div className="space-y-4">
      <RabCard data={data} />
      <datalist id="cost-categories">
        {data.categorySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <ExpenseCard data={data} />
      <details className="group rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer select-none px-5 py-3.5 text-[13.5px] font-semibold text-slate-600 hover:text-ink dark:text-slate-300">
          Pengaturan lanjutan: baseline dan anggaran manual
        </summary>
        <div className="space-y-4 border-t border-line px-4 py-4 dark:border-slate-800">
          <BaselineCard data={data} />
          <BudgetCard data={data} />
        </div>
      </details>
    </div>
  );
}

function BudgetCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItemDTO | null>(null);
  const [form, setForm] = useState({ category: PROJECT_COST_CATEGORIES[0] as string, description: "", amount: "" });
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/budget`;

  function openForm(b: BudgetItemDTO | null) {
    setEditing(b);
    setForm(b ? { category: b.category, description: b.description || "", amount: String(b.amount) } : { category: PROJECT_COST_CATEGORIES[0], description: "", amount: "" });
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (form.amount === "") return setError("Nominal anggaran wajib diisi.");
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, form, "Anggaran diperbarui.") : await send("POST", base, form, "Anggaran ditambahkan.");
    if (err) setError(err);
    else setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Anggaran manual</CardTitle>
        {data.canManage && (
          <Button size="sm" variant="outline" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Tambah anggaran
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.budgetItems.length === 0 ? (
          <EmptyState icon={Wallet} text="Belum ada anggaran manual." action={data.canManage ? { label: "Tambah anggaran", onClick: () => openForm(null) } : undefined} />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.budgetItems.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="px-5 py-2.5">
                    <p className="text-ink dark:text-slate-100">{b.category}</p>
                    {b.description && <p className="text-xs text-slate-500">{b.description}</p>}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(b.amount)}</td>
                  {data.canManage && (
                    <td className="px-3 py-2.5 w-20">
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label="Edit anggaran" onClick={() => openForm(b)} className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteButton what="anggaran" onConfirm={() => send("DELETE", `${base}/${b.id}`, undefined, "Anggaran dihapus.")} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit anggaran" : "Tambah anggaran"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bg-cat">Kategori biaya</Label>
            <Input id="bg-cat" list="cost-categories" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Pilih atau ketik kategori baru" />
          </div>
          <div>
            <Label htmlFor="bg-desc">Keterangan</Label>
            <Input id="bg-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="bg-amt">Nominal (Rp)</Label>
            <Input id="bg-amt" type="number" min={0} step="any" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
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

type ExpenseForm = {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  cause: string;
  referenceNo: string;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

function ExpenseCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [form, setForm] = useState<ExpenseForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/expenses`;

  function openForm(e: ExpenseDTO | null) {
    setEditing(e);
    setForm(
      e
        ? {
            expenseDate: e.expenseDate,
            category: e.category,
            description: e.description,
            amount: String(e.amount),
            cause: e.cause,
            referenceNo: e.referenceNo || "",
            fileUrl: e.fileUrl,
            driveFileId: e.driveFileId,
            fileMimeType: e.fileMimeType,
          }
        : { expenseDate: todayInput(), category: PROJECT_COST_CATEGORIES[0], description: "", amount: "", cause: "NORMAL", referenceNo: "", ...EMPTY_FILE }
    );
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!form) return;
    if (!form.category.trim() || !form.description.trim() || form.amount === "") return setError("Kategori, keterangan, dan nominal wajib diisi.");
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, form, "Realisasi biaya diperbarui.") : await send("POST", base, form, "Realisasi biaya dicatat.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Realisasi biaya</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {data.expenses.length
              ? `${data.expenses.length} transaksi, total ${formatRupiah(data.summary.costActual, true)}`
              : "Catat satu per satu atau impor dari Excel keuangan (kolom Akun otomatis dicocokkan dengan RAB)."}
          </p>
        </div>
        {data.canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <CostImportDialog projectId={data.projectId} label="Impor Excel" />
            <Button size="sm" onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" />
              Catat biaya
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.expenses.length === 0 ? (
          <EmptyState icon={Wallet} text="Belum ada realisasi biaya. Catat satu per satu, atau impor dari Excel keuangan." action={data.canManage ? { label: "Catat biaya", onClick: () => openForm(null) } : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2.5 font-medium">Tanggal</th>
                  <th className="px-3 py-2.5 font-medium">Keterangan</th>
                  <th className="px-3 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 font-medium text-right">Nominal</th>
                  {data.canManage && <th className="px-5 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                    <td className="px-5 py-2.5 whitespace-nowrap">{fmtDate(e.expenseDate)}</td>
                    <td className="px-3 py-2.5">
                      {e.description}
                      <div>
                        <FileLink url={e.fileUrl} label="Bukti" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {e.category}
                      {e.cause !== "NORMAL" && (
                        <span className="block mt-0.5">
                          <span className="stamp-badge bg-signal-soonBg text-signal-soon border-signal-soonBorder">{CAUSE_LABEL[e.cause]}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{formatRupiah(e.amount)}</td>
                    {data.canManage && (
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label="Edit biaya" onClick={() => openForm(e)} className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <DeleteButton what="realisasi biaya" onConfirm={() => send("DELETE", `${base}/${e.id}`, undefined, "Realisasi biaya dihapus.")} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit realisasi biaya" : "Catat realisasi biaya"}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ex-date">Tanggal</Label>
                <Input id="ex-date" type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ex-amt">Nominal (Rp)</Label>
                <Input id="ex-amt" type="number" min={0} step="any" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ex-cat">Kategori biaya</Label>
              <Input id="ex-cat" list="cost-categories" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Pilih atau ketik kategori baru" />
            </div>
            <div>
              <Label htmlFor="ex-cause">Penyebab biaya</Label>
              <Select id="ex-cause" value={form.cause} onChange={(e) => set("cause", e.target.value)}>
                <option value="NORMAL">Normal (sesuai rencana kerja)</option>
                <option value="DELAY">Akibat keterlambatan</option>
                <option value="EXTRA_SCOPE">Pekerjaan tambahan (di luar kontrak awal)</option>
              </Select>
              <p className="mt-1 text-xs text-slate-500">Dipakai untuk menjelaskan penyebab margin tergerus.</p>
            </div>
            <div>
              <Label htmlFor="ex-desc">Keterangan</Label>
              <Input id="ex-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Contoh: Tiket pesawat inspektur ke Balikpapan" />
            </div>
            <FileUploadField
              label="Bukti (opsional)"
              value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }}
              onChange={(v) => setForm((f) => (f ? { ...f, ...v } : f))}
            />
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
        )}
      </Modal>
    </Card>
  );
}

function BaselineCard({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = data.baseline;
  const m = data.margin;

  async function lock(reset: boolean) {
    setError(null);
    const err = await send("POST", `/api/projects/${data.projectId}/baseline`, { reset }, reset ? "Baseline diatur ulang." : "Baseline dikunci.");
    if (err) setError(err);
    else setConfirm(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            Baseline (rencana awal)
            <InfoTip label="Keterangan baseline (rencana awal)">Nilai kontrak, RAB, dan target selesai awal yang dikunci sebagai pembanding margin dan triple constraint.</InfoTip>
          </CardTitle>
        </div>
        {data.canManage && (
          <Button size="sm" variant="outline" onClick={() => (b ? setConfirm(true) : lock(false))} isLoading={busy && !confirm}>
            <Lock className="h-4 w-4" />
            {b ? "Atur ulang" : "Kunci baseline"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {b ? (
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Nilai kontrak awal</p>
              <p className="font-medium">{formatRupiah(b.contractValue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">RAB awal</p>
              <p className="font-medium">{formatRupiah(b.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Target selesai awal</p>
              <p className="font-medium">{fmtDate(b.endDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Margin awal</p>
              <p className="font-medium">
                {formatRupiah(m.plannedMargin, true)} ({formatPercent(m.plannedMarginPct)})
              </p>
            </div>
            <p className="sm:col-span-4 text-xs text-slate-400">
              Dikunci {fmtDate(b.lockedAt)}
              {b.lockedBy ? ` oleh ${b.lockedBy}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-signal-soon">
            Baseline belum dikunci; perbandingan memakai nilai kontrak dan RAB saat ini. Baseline terkunci otomatis saat RAB pertama kali diunggah.
          </p>
        )}
        <FormError message={error} />
      </CardContent>
      <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Atur ulang baseline?">
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Baseline akan diganti dengan nilai kontrak, RAB, dan target selesai <strong>saat ini</strong>. Gunakan hanya untuk memperbaiki baseline yang terkunci terlalu dini;
            perubahan dari addendum seharusnya tetap dibandingkan dengan rencana awal. Tindakan ini tercatat di Audit Log.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Batal
            </Button>
            <Button variant="danger" isLoading={busy} onClick={() => lock(true)}>
              Atur ulang
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
