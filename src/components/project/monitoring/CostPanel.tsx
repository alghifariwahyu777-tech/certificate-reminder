"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PROJECT_COST_CATEGORIES, formatPercent, formatRupiah } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, ProgressBar, Stat, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE } from "./shared";
import type { BudgetItemDTO, ExpenseDTO, ProjectMonitoringDTO } from "./types";

export function CostPanel({ data }: { data: ProjectMonitoringDTO }) {
  const sm = data.summary;
  const byCategory = useMemo(() => {
    const map = new Map<string, { budget: number; actual: number }>();
    for (const b of data.budgetItems) {
      const r = map.get(b.category) || { budget: 0, actual: 0 };
      r.budget += b.amount;
      map.set(b.category, r);
    }
    for (const e of data.expenses) {
      const r = map.get(e.category) || { budget: 0, actual: 0 };
      r.actual += e.amount;
      map.set(e.category, r);
    }
    return [...map.entries()].sort((a, b) => b[1].budget - a[1].budget);
  }, [data.budgetItems, data.expenses]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Anggaran (RAB)" value={formatRupiah(sm.budgetTotal, true)} />
        <Stat
          label="Realisasi biaya"
          tone={sm.budgetUsedPercent !== null && sm.budgetUsedPercent > 100 ? "bad" : "default"}
          value={formatRupiah(sm.costActual, true)}
          hint={sm.budgetUsedPercent !== null ? `${formatPercent(sm.budgetUsedPercent)} anggaran terpakai` : undefined}
        />
        <Stat
          label="CPI"
          tone={sm.cpi === null ? "default" : sm.cpi >= 1 ? "good" : sm.cpi >= 0.9 ? "warn" : "bad"}
          value={sm.cpi === null ? "-" : sm.cpi.toLocaleString("id-ID")}
          hint="(progres × anggaran) ÷ biaya aktual; ≥ 1 = hemat"
        />
        <Stat
          label="Estimasi margin"
          tone={sm.plannedMargin !== null && sm.plannedMargin < 0 ? "bad" : "default"}
          value={formatRupiah(sm.plannedMargin, true)}
          hint={sm.plannedMargin !== null && sm.contractValue ? `${formatPercent((sm.plannedMargin / sm.contractValue) * 100)} dari kontrak (rencana)` : "butuh nilai kontrak & anggaran"}
        />
      </div>

      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anggaran vs Realisasi per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCategory.map(([cat, v]) => {
              const pct = v.budget > 0 ? (v.actual / v.budget) * 100 : null;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink dark:text-slate-100">{cat}</span>
                    <span className={cn("tabular-nums text-slate-600 dark:text-slate-300", pct !== null && pct > 100 && "text-signal-expired font-medium")}>
                      {formatRupiah(v.actual, true)} / {v.budget ? formatRupiah(v.budget, true) : "tanpa anggaran"}
                    </span>
                  </div>
                  <ProgressBar value={pct ?? 100} className="mt-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <BudgetCard data={data} />
      <ExpenseCard data={data} />
    </div>
  );
}

const categoryOptions = (current?: string) => {
  const list: string[] = [...PROJECT_COST_CATEGORIES];
  if (current && !list.includes(current)) list.push(current);
  return list;
};

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
        <CardTitle>Anggaran Biaya (RAB)</CardTitle>
        {data.canManage && (
          <Button size="sm" variant="outline" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Tambah Anggaran
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.budgetItems.length === 0 ? (
          <EmptyState icon={Wallet} text="Belum ada anggaran biaya." />
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

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit Anggaran" : "Tambah Anggaran"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bg-cat">Kategori biaya</Label>
            <Select id="bg-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {categoryOptions(form.category).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
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

type ExpenseForm = { expenseDate: string; category: string; description: string; amount: string; fileUrl: string | null; driveFileId: string | null; fileMimeType: string | null };

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
        ? { expenseDate: e.expenseDate, category: e.category, description: e.description, amount: String(e.amount), fileUrl: e.fileUrl, driveFileId: e.driveFileId, fileMimeType: e.fileMimeType }
        : { expenseDate: todayInput(), category: PROJECT_COST_CATEGORIES[0], description: "", amount: "", ...EMPTY_FILE }
    );
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!form) return;
    if (!form.description.trim() || form.amount === "") return setError("Keterangan dan nominal wajib diisi.");
    const err = editing ? await send("PATCH", `${base}/${editing.id}`, form, "Realisasi biaya diperbarui.") : await send("POST", base, form, "Realisasi biaya dicatat.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Realisasi Biaya</CardTitle>
        {data.canManage && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Catat Biaya
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.expenses.length === 0 ? (
          <EmptyState icon={Wallet} text="Belum ada realisasi biaya." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
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
                    <td className="px-3 py-2.5 text-slate-500">{e.category}</td>
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

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit Realisasi Biaya" : "Catat Realisasi Biaya"}>
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
              <Select id="ex-cat" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categoryOptions(form.category).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
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
