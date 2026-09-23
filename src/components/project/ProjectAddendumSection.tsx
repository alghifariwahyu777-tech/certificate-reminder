"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Addendum = {
  id: string;
  addendumNumber: string;
  description: string | null;
  previousEndDate: string;
  newTargetEndDate: string;
  newContractValue: string | null;
  createdAt: string;
  createdBy: string | null;
};

export function ProjectAddendumSection({
  projectId,
  initialAddenda,
  canManage,
}: {
  projectId: string;
  initialAddenda: Addendum[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [addenda, setAddenda] = useState(initialAddenda);
  const [open, setOpen] = useState(false);
  const [addendumNumber, setAddendumNumber] = useState("");
  const [description, setDescription] = useState("");
  const [newTargetEndDate, setNewTargetEndDate] = useState("");
  const [newContractValue, setNewContractValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!addendumNumber.trim() || !newTargetEndDate) {
      setError("Nomor addendum dan target selesai baru wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/addenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addendumNumber,
          description,
          newTargetEndDate,
          newContractValue: newContractValue || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Gagal menyimpan addendum.");
        return;
      }
      setAddenda((prev) => [body.addendum, ...prev]);
      showToast("Addendum berhasil ditambahkan — target selesai project diperbarui.");
      setOpen(false);
      setAddendumNumber("");
      setDescription("");
      setNewTargetEndDate("");
      setNewContractValue("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Riwayat Addendum</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Addendum
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {addenda.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
            <FileText className="h-6 w-6" />
            <p className="text-sm">Belum ada addendum untuk project ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {addenda.map((a) => (
              <div key={a.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{a.addendumNumber}</p>
                  <p className="text-xs text-slate-400">{formatDate(a.createdAt)}</p>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Target selesai: {formatDate(a.previousEndDate)} → {formatDate(a.newTargetEndDate)}
                </p>
                {a.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.description}</p>}
                {a.createdBy && <p className="text-xs text-slate-400 mt-1">oleh {a.createdBy}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Tambah Addendum">
        <div className="space-y-4">
          <div>
            <Label htmlFor="add-number">Nomor/Nama Addendum</Label>
            <Input
              id="add-number"
              value={addendumNumber}
              onChange={(e) => setAddendumNumber(e.target.value)}
              placeholder="Contoh: Addendum 1"
            />
          </div>
          <div>
            <Label htmlFor="add-desc">Keterangan</Label>
            <Textarea id="add-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="add-date">Target Selesai Baru</Label>
              <Input
                id="add-date"
                type="date"
                value={newTargetEndDate}
                onChange={(e) => setNewTargetEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="add-value">Nilai Kontrak Baru (opsional)</Label>
              <Input
                id="add-value"
                type="number"
                step="any"
                value={newContractValue}
                onChange={(e) => setNewContractValue(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
              Batal
            </Button>
            <Button isLoading={saving} onClick={handleSubmit}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
