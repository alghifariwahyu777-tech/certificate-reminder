"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { useState } from "react";
import { Pencil, Plus, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TERM_STATUS_LABEL, formatRupiah, isInvoiceOverdue } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { DeleteButton, EmptyState, FileLink, FileUploadField, FormError, Stat, fmtDate, todayInput, useMonitoringApi, EMPTY_FILE, useOpenFromHash } from "./shared";
import type { ProjectMonitoringDTO, TermDTO } from "./types";

const STATUS_CLASS: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  INVOICED: "bg-signal-soonBg text-signal-soon border-signal-soonBorder",
  PAID: "bg-signal-activeBg text-signal-active border-signal-activeBorder",
};

type Form = {
  name: string;
  sequence: string;
  percent: string;
  amount: string;
  requirement: string;
  plannedDate: string;
  status: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string;
  paidAmount: string;
  notes: string;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toForm(t: TermDTO | null, nextSeq: number): Form {
  if (!t)
    return {
      name: `Termin ${nextSeq}`,
      sequence: String(nextSeq),
      percent: "",
      amount: "",
      requirement: "",
      plannedDate: "",
      status: "PLANNED",
      invoiceNumber: "",
      invoiceDate: "",
      dueDate: "",
      paidDate: "",
      paidAmount: "",
      notes: "",
      ...EMPTY_FILE,
    };
  return {
    name: t.name,
    sequence: s(t.sequence),
    percent: s(t.percent),
    amount: s(t.amount),
    requirement: s(t.requirement),
    plannedDate: s(t.plannedDate),
    status: t.status,
    invoiceNumber: s(t.invoiceNumber),
    invoiceDate: s(t.invoiceDate),
    dueDate: s(t.dueDate),
    paidDate: s(t.paidDate),
    paidAmount: s(t.paidAmount),
    notes: s(t.notes),
    fileUrl: t.fileUrl,
    driveFileId: t.driveFileId,
    fileMimeType: t.fileMimeType,
  };
}

export function TermPanel({ data }: { data: ProjectMonitoringDTO }) {
  const { send, busy } = useMonitoringApi();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TermDTO | null>(null);
  const [form, setForm] = useState<Form>(toForm(null, 1));
  const [error, setError] = useState<string | null>(null);
  const base = `/api/projects/${data.projectId}/terms`;
  const contract = data.contractValue ?? 0;
  const sm = data.summary;
  const termTotal = data.terms.reduce((a, t) => a + t.amount, 0);

  function openForm(t: TermDTO | null) {
    setEditing(t);
    setForm(toForm(t, data.terms.length + 1));
    setError(null);
    setOpen(true);
  }

  useOpenFromHash("termin", () => {
    if (data.canManage) openForm(null);
  });


  function setPercent(v: string) {
    setForm((f) => ({ ...f, percent: v, amount: contract > 0 && v !== "" ? String(Math.round((Number(v) / 100) * contract)) : f.amount }));
  }

  async function save() {
    if (!form.name.trim()) return setError("Nama termin wajib diisi.");
    if (form.amount === "" || isNaN(Number(form.amount))) return setError("Nominal termin wajib diisi.");
    const body = { ...form, sequence: form.sequence || 0 };
    const err = editing
      ? await send("PATCH", `${base}/${editing.id}`, body, "Termin diperbarui.")
      : await send("POST", base, body, "Termin ditambahkan.");
    if (err) setError(err);
    else setOpen(false);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const today = data.today;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Nilai kontrak" value={formatRupiah(contract || null, true)} hint={termTotal ? `Total termin ${formatRupiah(termTotal, true)}` : "termin belum diisi"} />
        <Stat label="Sudah ditagih" value={formatRupiah(sm.invoiced, true)} hint={contract ? `${Math.round((sm.invoiced / contract) * 100)}% dari kontrak` : undefined} />
        <Stat label="Sudah dibayar" tone="good" value={formatRupiah(sm.paid, true)} hint={contract ? `${Math.round((sm.paid / contract) * 100)}% dari kontrak` : undefined} />
        <Stat
          label="Piutang"
          tone={sm.overdueInvoiceCount ? "bad" : sm.outstanding ? "warn" : "default"}
          value={formatRupiah(sm.outstanding, true)}
          hint={sm.overdueInvoiceCount ? `${sm.overdueInvoiceCount} lewat jatuh tempo` : undefined}
        />
      </div>

      {contract > 0 && termTotal > 0 && Math.abs(termTotal - contract) >= 1 && (
        <p className="text-xs text-signal-soon">
          Total termin ({formatRupiah(termTotal)}) berbeda dengan nilai kontrak ({formatRupiah(contract)}).
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-1.5">
            Termin & penagihan
            <InfoTip label="Keterangan termin & penagihan">Alur: belum ditagih, lalu sudah ditagih (invoice terbit), lalu dibayar.</InfoTip>
          </CardTitle>
          </div>
          {data.canManage && (
            <Button size="sm" onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" />
              Tambah termin
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {data.terms.length === 0 ? (
            <EmptyState icon={Receipt} text="Belum ada termin pembayaran. Tambahkan sesuai pasal pembayaran di kontrak, misalnya Uang muka 20%, Termin 1 40%, Termin 2 40%." action={data.canManage ? { label: "Tambah termin", onClick: () => openForm(null) } : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-2.5 font-medium">Termin</th>
                    <th className="px-3 py-2.5 font-medium text-right">Nominal</th>
                    <th className="px-3 py-2.5 font-medium">Rencana tagih</th>
                    <th className="px-3 py-2.5 font-medium">Invoice</th>
                    <th className="px-3 py-2.5 font-medium">Pembayaran</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    {data.canManage && <th className="px-5 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {data.terms.map((t) => {
                    const overdue = isInvoiceOverdue(
                      { status: t.status, invoiceDate: t.invoiceDate ? Date.parse(t.invoiceDate) : null, dueDate: t.dueDate ? Date.parse(t.dueDate) : null },
                      today,
                      data.thresholds
                    );
                    const dueUnbilled = t.status === "PLANNED" && t.plannedDate && Date.parse(t.plannedDate) <= today;
                    return (
                      <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink dark:text-slate-100">{t.name}</p>
                          {t.requirement && <p className="text-xs text-slate-500 mt-0.5">Syarat: {t.requirement}</p>}
                          <FileLink url={t.fileUrl} label="Dokumen" />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(t.amount)}
                          {t.percent !== null && <span className="block text-xs text-slate-400">{t.percent.toLocaleString("id-ID")}%</span>}
                        </td>
                        <td className={cn("px-3 py-3 whitespace-nowrap", dueUnbilled && "text-signal-soon font-medium")}>
                          {fmtDate(t.plannedDate)}
                          {dueUnbilled && <span className="block text-[11px]">sudah waktunya ditagih</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {t.invoiceNumber || (t.invoiceDate ? "-" : "")}
                          {t.invoiceDate && <span className="block text-xs text-slate-500">{fmtDate(t.invoiceDate)}</span>}
                          {t.dueDate && (
                            <span className={cn("block text-xs", overdue ? "text-signal-expired font-medium" : "text-slate-500")}>
                              JT {fmtDate(t.dueDate)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {t.paidDate ? (
                            <>
                              {fmtDate(t.paidDate)}
                              <span className="block text-xs text-slate-500">{formatRupiah(t.paidAmount ?? t.amount)}</span>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("stamp-badge", overdue ? "bg-signal-expiredBg text-signal-expired border-signal-expiredBorder" : STATUS_CLASS[t.status])}>
                            {overdue ? "Lewat Jatuh Tempo" : TERM_STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        {data.canManage && (
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                aria-label="Edit termin"
                                onClick={() => openForm(t)}
                                className="p-1.5 rounded text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <DeleteButton what="termin" onConfirm={() => send("DELETE", `${base}/${t.id}`, undefined, "Termin dihapus.")} />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit termin" : "Tambah termin"} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div>
              <Label htmlFor="tm-name">Nama termin</Label>
              <Input id="tm-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Uang Muka / Termin 1" />
            </div>
            <div>
              <Label htmlFor="tm-seq">Urutan</Label>
              <Input id="tm-seq" type="number" min={0} value={form.sequence} onChange={(e) => set("sequence", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tm-pct">% dari kontrak (opsional)</Label>
              <Input id="tm-pct" type="number" min={0} max={100} step="any" value={form.percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tm-amt">Nominal (Rp)</Label>
              <Input id="tm-amt" type="number" min={0} step="any" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="tm-req">Syarat penagihan</Label>
              <Input id="tm-req" value={form.requirement} onChange={(e) => set("requirement", e.target.value)} placeholder="Contoh: Progres 50% + BAPP ditandatangani" />
            </div>
            <div>
              <Label htmlFor="tm-plan">Rencana tanggal tagih</Label>
              <Input id="tm-plan" type="date" value={form.plannedDate} onChange={(e) => set("plannedDate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tm-status">Status</Label>
              <Select
                id="tm-status"
                value={form.status}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    status: v,
                    invoiceDate: v !== "PLANNED" && !f.invoiceDate ? todayInput() : f.invoiceDate,
                    paidDate: v === "PAID" && !f.paidDate ? todayInput() : f.paidDate,
                    paidAmount: v === "PAID" && !f.paidAmount ? f.amount : f.paidAmount,
                  }));
                }}
              >
                {Object.entries(TERM_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {form.status !== "PLANNED" && (
            <div className="grid grid-cols-3 gap-3 rounded-md bg-slate-50 dark:bg-slate-800/50 p-3">
              <div>
                <Label htmlFor="tm-inv">No. invoice</Label>
                <Input id="tm-inv" value={form.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tm-invd">Tgl invoice</Label>
                <Input id="tm-invd" type="date" value={form.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tm-due">Jatuh tempo</Label>
                <Input id="tm-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            </div>
          )}
          {form.status === "PAID" && (
            <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 dark:bg-slate-800/50 p-3">
              <div>
                <Label htmlFor="tm-paid">Tgl dibayar</Label>
                <Input id="tm-paid" type="date" value={form.paidDate} onChange={(e) => set("paidDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tm-paida">Nominal diterima (Rp)</Label>
                <Input id="tm-paida" type="number" min={0} step="any" value={form.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="tm-notes">Catatan</Label>
            <Textarea id="tm-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <FileUploadField
            label="Invoice / bukti bayar (opsional)"
            value={{ fileUrl: form.fileUrl, driveFileId: form.driveFileId, fileMimeType: form.fileMimeType }}
            onChange={(v) => setForm((f) => ({ ...f, ...v }))}
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
      </Modal>
    </div>
  );
}
