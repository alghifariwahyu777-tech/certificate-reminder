"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, Workflow, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { STAGE_TYPES } from "@/lib/validations";

type DocumentTypeOption = { id: string; name: string };

type RequirementItem = {
  id: string;
  documentTypeId: string;
  documentTypeName: string;
  mandatory: boolean;
  allowedFileTypes: string;
  maxFileSizeMB: number;
  templateUrl: string | null;
  displayOrder: number;
};

type StageItem = {
  id: string;
  name: string;
  stageType: string;
  sequence: number;
  slaDays: number | null;
  picRole: string | null;
  clientVisible: boolean;
  clientDescription: string | null;
};

const STAGE_TYPE_LABELS: Record<string, string> = {
  APPLICATION: "Permohonan",
  DOCUMENT_REVIEW: "Review Dokumen",
  PREPARATION: "Persiapan",
  AUDIT: "Audit",
  ASSESSMENT: "Assessment",
  CERTIFICATION_DECISION: "Keputusan Sertifikasi",
  CERTIFICATE_ISSUANCE: "Penerbitan Sertifikat",
  SURVEILLANCE: "Surveillance",
  COMPLETED: "Selesai",
  CUSTOM: "Kustom",
};

export function ServiceDetailManager({
  serviceId,
  canManage,
  documentTypeOptions,
  initialRequirements,
  initialStages,
}: {
  serviceId: string;
  canManage: boolean;
  documentTypeOptions: DocumentTypeOption[];
  initialRequirements: RequirementItem[];
  initialStages: StageItem[];
}) {
  const { showToast } = useToast();

  const [requirements, setRequirements] = useState(initialRequirements);
  const [reqFormOpen, setReqFormOpen] = useState(false);
  const [reqEditTarget, setReqEditTarget] = useState<RequirementItem | null>(null);
  const [reqDocumentTypeId, setReqDocumentTypeId] = useState("");
  const [reqMandatory, setReqMandatory] = useState(true);
  const [reqFileTypes, setReqFileTypes] = useState("pdf,jpg,png");
  const [reqMaxSize, setReqMaxSize] = useState(10);
  const [reqDisplayOrder, setReqDisplayOrder] = useState(0);
  const [reqSaving, setReqSaving] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqDeleteTarget, setReqDeleteTarget] = useState<RequirementItem | null>(null);
  const [reqDeleting, setReqDeleting] = useState(false);

  const [stages, setStages] = useState(initialStages);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [stageEditTarget, setStageEditTarget] = useState<StageItem | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageType, setStageType] = useState<string>("APPLICATION");
  const [stageSequence, setStageSequence] = useState(1);
  const [stageSla, setStageSla] = useState<string>("");
  const [stagePicRole, setStagePicRole] = useState("");
  const [stageClientVisible, setStageClientVisible] = useState(true);
  const [stageClientDescription, setStageClientDescription] = useState("");
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<StageItem | null>(null);
  const [stageDeleting, setStageDeleting] = useState(false);

  function openAddReq() {
    setReqEditTarget(null);
    setReqDocumentTypeId(documentTypeOptions[0]?.id || "");
    setReqMandatory(true);
    setReqFileTypes("pdf,jpg,png");
    setReqMaxSize(10);
    setReqDisplayOrder(requirements.length);
    setReqError(null);
    setReqFormOpen(true);
  }

  function openEditReq(item: RequirementItem) {
    setReqEditTarget(item);
    setReqDocumentTypeId(item.documentTypeId);
    setReqMandatory(item.mandatory);
    setReqFileTypes(item.allowedFileTypes);
    setReqMaxSize(item.maxFileSizeMB);
    setReqDisplayOrder(item.displayOrder);
    setReqError(null);
    setReqFormOpen(true);
  }

  async function handleSaveReq() {
    setReqError(null);
    setReqSaving(true);
    try {
      const payload = {
        documentTypeId: reqDocumentTypeId,
        mandatory: reqMandatory,
        allowedFileTypes: reqFileTypes,
        maxFileSizeMB: reqMaxSize,
        displayOrder: reqDisplayOrder,
      };
      const url = reqEditTarget
        ? `/api/services/${serviceId}/requirements/${reqEditTarget.id}`
        : `/api/services/${serviceId}/requirements`;
      const res = await fetch(url, {
        method: reqEditTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setReqError(body.message);
        return;
      }
      const saved: RequirementItem = {
        id: body.requirement.id,
        documentTypeId: body.requirement.documentTypeId,
        documentTypeName: body.requirement.documentType.name,
        mandatory: body.requirement.mandatory,
        allowedFileTypes: body.requirement.allowedFileTypes,
        maxFileSizeMB: body.requirement.maxFileSizeMB,
        templateUrl: body.requirement.templateUrl,
        displayOrder: body.requirement.displayOrder,
      };
      if (reqEditTarget) {
        setRequirements((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        showToast("Persyaratan berhasil diperbarui.");
      } else {
        setRequirements((prev) => [...prev, saved].sort((a, b) => a.displayOrder - b.displayOrder));
        showToast("Persyaratan berhasil ditambahkan.");
      }
      setReqFormOpen(false);
    } finally {
      setReqSaving(false);
    }
  }

  async function handleDeleteReq() {
    if (!reqDeleteTarget) return;
    setReqDeleting(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/requirements/${reqDeleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus persyaratan.", "error");
        return;
      }
      setRequirements((prev) => prev.filter((r) => r.id !== reqDeleteTarget.id));
      showToast("Persyaratan berhasil dihapus.");
      setReqDeleteTarget(null);
    } finally {
      setReqDeleting(false);
    }
  }

  function openAddStage() {
    setStageEditTarget(null);
    setStageName("");
    setStageType("APPLICATION");
    setStageSequence(stages.length + 1);
    setStageSla("");
    setStagePicRole("");
    setStageClientVisible(true);
    setStageClientDescription("");
    setStageError(null);
    setStageFormOpen(true);
  }

  function openEditStage(item: StageItem) {
    setStageEditTarget(item);
    setStageName(item.name);
    setStageType(item.stageType);
    setStageSequence(item.sequence);
    setStageSla(item.slaDays?.toString() || "");
    setStagePicRole(item.picRole || "");
    setStageClientVisible(item.clientVisible);
    setStageClientDescription(item.clientDescription || "");
    setStageError(null);
    setStageFormOpen(true);
  }

  async function handleSaveStage() {
    setStageError(null);
    setStageSaving(true);
    try {
      const payload = {
        name: stageName,
        stageType,
        sequence: stageSequence,
        slaDays: stageSla ? Number(stageSla) : undefined,
        picRole: stagePicRole || undefined,
        clientVisible: stageClientVisible,
        clientDescription: stageClientDescription || undefined,
      };
      const url = stageEditTarget
        ? `/api/services/${serviceId}/stages/${stageEditTarget.id}`
        : `/api/services/${serviceId}/stages`;
      const res = await fetch(url, {
        method: stageEditTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setStageError(body.message);
        return;
      }
      if (stageEditTarget) {
        setStages((prev) =>
          prev.map((s) => (s.id === body.stage.id ? body.stage : s)).sort((a, b) => a.sequence - b.sequence)
        );
        showToast("Tahap workflow berhasil diperbarui.");
      } else {
        setStages((prev) => [...prev, body.stage].sort((a, b) => a.sequence - b.sequence));
        showToast("Tahap workflow berhasil ditambahkan.");
      }
      setStageFormOpen(false);
    } finally {
      setStageSaving(false);
    }
  }

  async function handleDeleteStage() {
    if (!stageDeleteTarget) return;
    setStageDeleting(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/stages/${stageDeleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body.message || "Gagal menghapus tahap.", "error");
        return;
      }
      setStages((prev) => prev.filter((s) => s.id !== stageDeleteTarget.id));
      showToast("Tahap workflow berhasil dihapus.");
      setStageDeleteTarget(null);
    } finally {
      setStageDeleting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <CardTitle>Persyaratan Dokumen</CardTitle>
          </div>
          {canManage && (
            <Button size="sm" onClick={openAddReq} disabled={documentTypeOptions.length === 0}>
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {documentTypeOptions.length === 0 && (
            <p className="px-5 py-4 text-xs text-signal-soon bg-signal-soonBg">
              Belum ada Jenis Dokumen di master data. Tambahkan dulu di halaman{" "}
              <a href="/document-types" className="underline font-medium">
                Document Types
              </a>
              .
            </p>
          )}
          {requirements.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada persyaratan dokumen.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requirements.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">{r.documentTypeName}</p>
                      <span
                        className={`stamp-badge ${
                          r.mandatory
                            ? "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder"
                            : "text-slate-500 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {r.mandatory ? "Wajib" : "Opsional"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {r.allowedFileTypes} · maks {r.maxFileSizeMB}MB
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditReq(r)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                        aria-label="Edit persyaratan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setReqDeleteTarget(r)}
                        className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                        aria-label="Hapus persyaratan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-slate-400" />
            <CardTitle>Tahap Workflow</CardTitle>
          </div>
          {canManage && (
            <Button size="sm" onClick={openAddStage}>
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {stages.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada tahap workflow.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-full bg-ink text-white text-xs font-mono flex items-center justify-center shrink-0">
                      {s.sequence}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                        {s.clientVisible ? (
                          <Eye className="h-3 w-3 text-slate-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-slate-300" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {STAGE_TYPE_LABELS[s.stageType] || s.stageType}
                        {s.slaDays ? ` · SLA ${s.slaDays} hari` : ""}
                        {s.picRole ? ` · ${s.picRole}` : ""}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditStage(s)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                        aria-label="Edit tahap"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setStageDeleteTarget(s)}
                        className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                        aria-label="Hapus tahap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={reqFormOpen}
        onClose={() => setReqFormOpen(false)}
        title={reqEditTarget ? "Edit Persyaratan" : "Tambah Persyaratan"}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="req-doctype">Jenis Dokumen</Label>
            <Select
              id="req-doctype"
              value={reqDocumentTypeId}
              onChange={(e) => setReqDocumentTypeId(e.target.value)}
              disabled={!!reqEditTarget}
            >
              {documentTypeOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={reqMandatory}
              onChange={(e) => setReqMandatory(e.target.checked)}
              className="rounded border-slate-300"
            />
            Dokumen wajib
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="req-filetypes">Tipe File (pisah koma)</Label>
              <Input id="req-filetypes" value={reqFileTypes} onChange={(e) => setReqFileTypes(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="req-maxsize">Maks Ukuran (MB)</Label>
              <Input
                id="req-maxsize"
                type="number"
                min={1}
                value={reqMaxSize}
                onChange={(e) => setReqMaxSize(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="req-order">Urutan Tampil</Label>
            <Input
              id="req-order"
              type="number"
              min={0}
              value={reqDisplayOrder}
              onChange={(e) => setReqDisplayOrder(Number(e.target.value))}
            />
          </div>
          {reqError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {reqError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setReqFormOpen(false)}>
              Batal
            </Button>
            <Button isLoading={reqSaving} onClick={handleSaveReq}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!reqDeleteTarget} onClose={() => setReqDeleteTarget(null)} title="Hapus Persyaratan">
        <p className="text-sm text-slate-600">
          Hapus persyaratan dokumen <strong>{reqDeleteTarget?.documentTypeName}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setReqDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={reqDeleting} onClick={handleDeleteReq}>
            Hapus
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={stageFormOpen}
        onClose={() => setStageFormOpen(false)}
        title={stageEditTarget ? "Edit Tahap Workflow" : "Tambah Tahap Workflow"}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage-name">Nama Tahap</Label>
              <Input id="stage-name" value={stageName} onChange={(e) => setStageName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="stage-seq">Urutan</Label>
              <Input
                id="stage-seq"
                type="number"
                min={1}
                value={stageSequence}
                onChange={(e) => setStageSequence(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="stage-type">Tipe Tahap</Label>
            <Select id="stage-type" value={stageType} onChange={(e) => setStageType(e.target.value)}>
              {STAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STAGE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage-sla">SLA (hari, opsional)</Label>
              <Input id="stage-sla" type="number" min={0} value={stageSla} onChange={(e) => setStageSla(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="stage-pic">PIC Role (opsional)</Label>
              <Input id="stage-pic" value={stagePicRole} onChange={(e) => setStagePicRole(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={stageClientVisible}
              onChange={(e) => setStageClientVisible(e.target.checked)}
              className="rounded border-slate-300"
            />
            Tampilkan tahap ini ke klien
          </label>
          {stageClientVisible && (
            <div>
              <Label htmlFor="stage-client-desc">Deskripsi untuk Klien (opsional)</Label>
              <Textarea
                id="stage-client-desc"
                rows={2}
                placeholder="Bahasa yang lebih mudah dipahami klien, mis. 'Audit sedang berlangsung'"
                value={stageClientDescription}
                onChange={(e) => setStageClientDescription(e.target.value)}
              />
            </div>
          )}
          {stageError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {stageError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setStageFormOpen(false)}>
              Batal
            </Button>
            <Button isLoading={stageSaving} onClick={handleSaveStage}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!stageDeleteTarget} onClose={() => setStageDeleteTarget(null)} title="Hapus Tahap Workflow">
        <p className="text-sm text-slate-600">
          Hapus tahap <strong>{stageDeleteTarget?.name}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setStageDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={stageDeleting} onClick={handleDeleteStage}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
