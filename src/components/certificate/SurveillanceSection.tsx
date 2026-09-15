"use client";

import { useState } from "react";
import { CalendarClock, Pencil, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input, Textarea, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { SURVEILLANCE_STATUS_LABELS, SURVEILLANCE_STATUS_COLORS, isSurveillanceOverdue } from "@/lib/surveillance";

type SurveillanceItem = {
  id: string;
  sequenceNumber: number;
  scheduledDate: string;
  status: string;
  completedDate: string | null;
  picName: string | null;
  notes: string | null;
  result: string | null;
};

export function SurveillanceSection({
  certificateId,
  canManage,
  initialSurveillances,
}: {
  certificateId: string;
  canManage: boolean;
  initialSurveillances: SurveillanceItem[];
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialSurveillances);

  const [editTarget, setEditTarget] = useState<SurveillanceItem | null>(null);
  const [status, setStatus] = useState("SCHEDULED");
  const [scheduledDate, setScheduledDate] = useState("");
  const [picName, setPicName] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(item: SurveillanceItem) {
    setEditTarget(item);
    setStatus(item.status);
    setScheduledDate(item.scheduledDate.slice(0, 10));
    setPicName(item.picName || "");
    setNotes(item.notes || "");
    setResult(item.result || "");
    setError(null);
  }

  async function handleSave() {
    if (!editTarget) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/certificates/${certificateId}/surveillances/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, scheduledDate, picName, notes, result }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Gagal memperbarui surveillance.");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === editTarget.id ? body.surveillance : i)));
      showToast("Surveillance berhasil diperbarui.");
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <CardTitle>Jadwal Surveillance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {items.map((s) => {
              const overdue = isSurveillanceOverdue(s.status, s.scheduledDate);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">Surveillance ke-{s.sequenceNumber}</p>
                      <span className={`stamp-badge ${SURVEILLANCE_STATUS_COLORS[s.status]}`}>
                        {SURVEILLANCE_STATUS_LABELS[s.status]}
                      </span>
                      {overdue && (
                        <span className="stamp-badge text-signal-expired bg-signal-expiredBg border-signal-expiredBorder">
                          <AlertTriangle className="h-3 w-3" /> Terlambat
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Jadwal {formatDate(s.scheduledDate)}
                      {s.picName ? ` · PIC: ${s.picName}` : ""}
                      {s.completedDate ? ` · Selesai ${formatDate(s.completedDate)}` : ""}
                    </p>
                    {s.result && <p className="text-xs text-slate-500 mt-1">{s.result}</p>}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent shrink-0"
                      aria-label="Edit surveillance"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Surveillance ke-${editTarget?.sequenceNumber || ""}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sv-status">Status</Label>
              <Select id="sv-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(SURVEILLANCE_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="sv-date">Tanggal Jadwal</Label>
              <Input id="sv-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="sv-pic">PIC (opsional)</Label>
            <Input id="sv-pic" value={picName} onChange={(e) => setPicName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sv-notes">Catatan Internal (opsional)</Label>
            <Textarea id="sv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sv-result">Hasil (opsional, terlihat oleh klien)</Label>
            <Textarea id="sv-result" rows={2} value={result} onChange={(e) => setResult(e.target.value)} />
          </div>
          {error && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Batal
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
