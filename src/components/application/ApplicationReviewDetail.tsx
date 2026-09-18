"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  CheckCircle2,
  XCircle,
  MinusCircle,
  MessageSquare,
  Workflow,
  Circle,
  Pencil,
  Award,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Textarea, Label, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_COLORS,
} from "@/lib/application";

type ApplicationInfo = {
  id: string;
  applicationNumber: string;
  status: string;
  contactName: string;
  contactPosition: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  clientName: string;
  serviceName: string;
  contractValue: number | null;
};

type RequirementInfo = { id: string; documentTypeName: string; mandatory: boolean };

type DocumentInfo = {
  id: string;
  version: number;
  fileUrl: string;
  status: string;
  reviewComment: string | null;
  reviewedBy: string | null;
};

type StageInfo = {
  id: string;
  name: string;
  sequence: number;
  slaDays: number | null;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  picName: string | null;
  internalNote: string | null;
};

type CertificateInfo = { id: string; certificateNumber: string };
type SelectOption = { id: string; name: string };

const DOC_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Menunggu Review",
  APPROVED: "Disetujui",
  REVISION_REQUIRED: "Perlu Revisi",
};
const DOC_STATUS_COLORS: Record<string, string> = {
  UPLOADED: "text-accent bg-accent/5 border-accent/20",
  APPROVED: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  REVISION_REQUIRED: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
};

export function ApplicationReviewDetail({
  canManage,
  application,
  requirements,
  documentsByRequirement,
  stages,
  certificate,
  categoryOptions,
  departmentOptions,
}: {
  canManage: boolean;
  application: ApplicationInfo;
  requirements: RequirementInfo[];
  documentsByRequirement: Record<string, DocumentInfo>;
  stages: StageInfo[];
  certificate: CertificateInfo | null;
  categoryOptions: SelectOption[];
  departmentOptions: SelectOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState(documentsByRequirement);
  const [stageList, setStageList] = useState(stages);
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.notes || "");
  const [statusSaving, setStatusSaving] = useState(false);

  const [contractValue, setContractValue] = useState(application.contractValue?.toString() || "");
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const [stageEditTarget, setStageEditTarget] = useState<StageInfo | null>(null);
  const [stageEditStatus, setStageEditStatus] = useState("PENDING");
  const [stageEditPic, setStageEditPic] = useState("");
  const [stageEditNote, setStageEditNote] = useState("");
  const [stageSaving, setStageSaving] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<{ reqId: string; doc: DocumentInfo; documentTypeName: string } | null>(
    null
  );
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState<"APPROVED" | "REVISION_REQUIRED" | null>(null);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    certificateNumber: "",
    certificateName: application.serviceName,
    categoryId: categoryOptions[0]?.id || "",
    departmentId: "",
    issuingBody: "",
    issueDate: new Date().toISOString().slice(0, 10),
    validFrom: "",
    expiryDate: "",
    storageLocation: "",
    pic: application.contactName,
    picEmail: application.contactEmail || "",
    ccEmail: "",
    description: "",
    notes: "",
  });
  const [issueFileUrl, setIssueFileUrl] = useState<string | null>(null);
  const [issueDriveFileId, setIssueDriveFileId] = useState<string | null>(null);
  const [issueFileMimeType, setIssueFileMimeType] = useState<string | null>(null);
  const [issueFileName, setIssueFileName] = useState("");
  const [issueUploading, setIssueUploading] = useState(false);
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  async function handleSaveStatus() {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal mengubah status.", "error");
        return;
      }
      showToast("Status permohonan berhasil diperbarui.");
      router.refresh();
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleSaveContractValue() {
    setContractError(null);
    setContractSaving(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/contract-value`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractValue: contractValue ? Number(contractValue) : 0 }),
      });
      const body = await res.json();
      if (!res.ok) {
        setContractError(body.message || "Gagal menyimpan nilai kontrak.");
        return;
      }
      showToast("Nilai kontrak berhasil disimpan.");
    } finally {
      setContractSaving(false);
    }
  }

  function openReview(reqId: string, doc: DocumentInfo, documentTypeName: string) {
    setReviewTarget({ reqId, doc, documentTypeName });
    setReviewComment("");
  }

  async function handleReview(reviewStatus: "APPROVED" | "REVISION_REQUIRED") {
    if (!reviewTarget) return;
    setReviewSaving(reviewStatus);
    try {
      const res = await fetch(
        `/api/applications/${application.id}/documents/${reviewTarget.doc.id}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: reviewStatus, reviewComment: reviewComment || undefined }),
        }
      );
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal menyimpan review.", "error");
        return;
      }
      setDocuments((prev) => ({ ...prev, [reviewTarget.reqId]: body.document }));
      showToast(reviewStatus === "APPROVED" ? "Dokumen disetujui." : "Revisi diminta.");
      setReviewTarget(null);
    } finally {
      setReviewSaving(null);
    }
  }

  function openStageEdit(stage: StageInfo) {
    setStageEditTarget(stage);
    setStageEditStatus(stage.status);
    setStageEditPic(stage.picName || "");
    setStageEditNote(stage.internalNote || "");
  }

  async function handleSaveStage() {
    if (!stageEditTarget) return;
    setStageSaving(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/stages/${stageEditTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: stageEditStatus,
          picName: stageEditPic || undefined,
          internalNote: stageEditNote || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal memperbarui tahap.", "error");
        return;
      }
      setStageList((prev) =>
        prev.map((s) =>
          s.id === stageEditTarget.id
            ? {
                ...s,
                status: body.stage.status,
                startDate: body.stage.startDate,
                targetDate: body.stage.targetDate,
                completedDate: body.stage.completedDate,
                picName: body.stage.picName,
                internalNote: body.stage.internalNote,
              }
            : s
        )
      );
      showToast("Tahap berhasil diperbarui.");
      setStageEditTarget(null);
    } finally {
      setStageSaving(false);
    }
  }

  async function handleIssueFileChange(file: File | undefined) {
    if (!file) return;
    setIssueUploading(true);
    setIssueError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "certificates");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setIssueError(body.message || "Gagal mengunggah dokumen.");
        return;
      }
      setIssueFileUrl(body.fileUrl);
      setIssueDriveFileId(body.driveFileId);
      setIssueFileMimeType(body.fileMimeType);
      setIssueFileName(file.name);
    } finally {
      setIssueUploading(false);
    }
  }

  async function handleIssueCertificate() {
    setIssueError(null);
    if (!issueFileUrl || !issueDriveFileId || !issueFileMimeType) {
      setIssueError("Dokumen sertifikat wajib diunggah.");
      return;
    }
    setIssueSaving(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...issueForm,
          fileUrl: issueFileUrl,
          driveFileId: issueDriveFileId,
          fileMimeType: issueFileMimeType,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setIssueError(body.message || "Gagal menerbitkan sertifikat.");
        return;
      }
      showToast("Sertifikat berhasil diterbitkan. Permohonan otomatis diselesaikan.");
      setIssueOpen(false);
      router.refresh();
    } finally {
      setIssueSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informasi Permohonan</CardTitle>
            <span className={`stamp-badge ${APPLICATION_STATUS_COLORS[application.status]}`}>
              {APPLICATION_STATUS_LABELS[application.status]}
            </span>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-400">Klien:</span> <span className="text-ink">{application.clientName}</span>
            </p>
            <p>
              <span className="text-slate-400">Layanan:</span>{" "}
              <span className="text-ink">{application.serviceName}</span>
            </p>
            <p>
              <span className="text-slate-400">Kontak:</span> {application.contactName}
              {application.contactPosition ? ` (${application.contactPosition})` : ""}
            </p>
            {application.contactEmail && (
              <p>
                <span className="text-slate-400">Email:</span> {application.contactEmail}
              </p>
            )}
            {application.contactPhone && (
              <p>
                <span className="text-slate-400">Telepon:</span> {application.contactPhone}
              </p>
            )}
            {application.description && (
              <p>
                <span className="text-slate-400">Catatan Klien:</span> {application.description}
              </p>
            )}
            <p className="text-xs text-slate-400 pt-1">
              Dibuat {formatDate(application.createdAt)}
              {application.submittedAt ? ` · Diajukan ${formatDate(application.submittedAt)}` : ""}
            </p>
          </CardContent>
        </Card>

        {certificate ? (
          <div className="flex items-center gap-2.5 rounded-md border border-signal-activeBorder bg-signal-activeBg px-4 py-3 text-sm text-signal-active">
            <Award className="h-4 w-4 shrink-0" />
            <span>
              Sertifikat <strong>{certificate.certificateNumber}</strong> telah diterbitkan.
            </span>
            <Link href={`/certificate/${certificate.id}`} className="ml-auto underline font-medium">
              Lihat Sertifikat
            </Link>
          </div>
        ) : (
          canManage &&
          application.status === "APPROVED" && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent/5 px-4 py-3">
              <p className="text-sm text-ink">
                Permohonan ini sudah disetujui — siap diterbitkan sertifikatnya.
              </p>
              <Button size="sm" onClick={() => setIssueOpen(true)}>
                <Award className="h-3.5 w-3.5" />
                Terbitkan Sertifikat
              </Button>
            </div>
          )
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dokumen Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {requirements.map((r) => {
                const doc = documents[r.id];
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">{r.documentTypeName}</p>
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
                      {doc ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          {doc.status === "APPROVED" && <CheckCircle2 className="h-3.5 w-3.5 text-signal-active" />}
                          {doc.status === "REVISION_REQUIRED" && <XCircle className="h-3.5 w-3.5 text-signal-expired" />}
                          {doc.status === "UPLOADED" && <MinusCircle className="h-3.5 w-3.5 text-accent" />}
                          <span className={`stamp-badge ${DOC_STATUS_COLORS[doc.status]}`}>
                            {DOC_STATUS_LABELS[doc.status]} (v{doc.version})
                          </span>
                          {doc.reviewedBy && <span className="text-xs text-slate-400">oleh {doc.reviewedBy}</span>}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Belum diunggah klien</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc && (
                        <>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                            aria-label="Lihat dokumen"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          {canManage && (
                            <Button variant="outline" size="sm" onClick={() => openReview(r.id, doc, r.documentTypeName)}>
                              <MessageSquare className="h-3.5 w-3.5" />
                              Review
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {stageList.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Workflow className="h-4 w-4 text-slate-400" />
              <CardTitle>Tracking Proses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {stageList.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-start gap-3 min-w-0">
                      {s.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-5 w-5 text-signal-active shrink-0 mt-0.5" />
                      ) : s.status === "IN_PROGRESS" ? (
                        <div className="h-5 w-5 rounded-full bg-signal-soon shrink-0 mt-0.5 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink">{s.name}</p>
                          <span className={`stamp-badge ${STAGE_STATUS_COLORS[s.status]}`}>
                            {STAGE_STATUS_LABELS[s.status]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.picName ? `PIC: ${s.picName}` : ""}
                          {s.targetDate ? `${s.picName ? " · " : ""}Target ${formatDate(s.targetDate)}` : ""}
                          {s.completedDate ? `${s.picName || s.targetDate ? " · " : ""}Selesai ${formatDate(s.completedDate)}` : ""}
                        </p>
                        {s.internalNote && <p className="text-xs text-slate-500 mt-1">{s.internalNote}</p>}
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => openStageEdit(s)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent shrink-0"
                        aria-label="Edit tahap"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {canManage && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ubah Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="app-status">Status Permohonan</Label>
                <Select id="app-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(APPLICATION_STATUS_LABELS)
                    .filter(([key]) => key !== "COMPLETED")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="app-notes">Catatan Internal</Label>
                <Textarea
                  id="app-notes"
                  rows={4}
                  placeholder="Catatan ini hanya terlihat oleh internal, tidak oleh klien."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveStatus} isLoading={statusSaving} className="w-full">
                Simpan
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Nilai Kontrak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="app-contract-value">Nilai Kontrak (Rp)</Label>
                <Input
                  id="app-contract-value"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                />
              </div>
              {contractError && (
                <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
                  {contractError}
                </div>
              )}
              <Button onClick={handleSaveContractValue} isLoading={contractSaving} className="w-full">
                Simpan Nilai Kontrak
              </Button>
              <p className="text-xs text-slate-400">
                Dipakai untuk halaman Monitoring — tidak terlihat oleh klien.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal isOpen={!!stageEditTarget} onClose={() => setStageEditTarget(null)} title={`Edit Tahap: ${stageEditTarget?.name || ""}`}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="stage-edit-status">Status Tahap</Label>
            <Select id="stage-edit-status" value={stageEditStatus} onChange={(e) => setStageEditStatus(e.target.value)}>
              {Object.entries(STAGE_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="stage-edit-pic">PIC</Label>
            <Input id="stage-edit-pic" value={stageEditPic} onChange={(e) => setStageEditPic(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="stage-edit-note">Catatan Internal (opsional)</Label>
            <Textarea id="stage-edit-note" rows={3} value={stageEditNote} onChange={(e) => setStageEditNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStageEditTarget(null)}>
              Batal
            </Button>
            <Button isLoading={stageSaving} onClick={handleSaveStage}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={`Review: ${reviewTarget?.documentTypeName || ""}`}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="review-comment">Komentar (opsional untuk setuju, disarankan untuk revisi)</Label>
            <Textarea
              id="review-comment"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="danger"
              isLoading={reviewSaving === "REVISION_REQUIRED"}
              onClick={() => handleReview("REVISION_REQUIRED")}
            >
              Minta Revisi
            </Button>
            <Button isLoading={reviewSaving === "APPROVED"} onClick={() => handleReview("APPROVED")}>
              Setujui
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={issueOpen} onClose={() => setIssueOpen(false)} title="Terbitkan Sertifikat" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue-number">Nomor Sertifikat</Label>
              <Input
                id="issue-number"
                value={issueForm.certificateNumber}
                onChange={(e) => setIssueForm((f) => ({ ...f, certificateNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="issue-category">Kategori</Label>
              <Select
                id="issue-category"
                value={issueForm.categoryId}
                onChange={(e) => setIssueForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="issue-name">Nama Sertifikat</Label>
            <Input
              id="issue-name"
              value={issueForm.certificateName}
              onChange={(e) => setIssueForm((f) => ({ ...f, certificateName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue-department">Divisi (opsional)</Label>
              <Select
                id="issue-department"
                value={issueForm.departmentId}
                onChange={(e) => setIssueForm((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="">-</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="issue-issuing-body">Instansi Penerbit (opsional)</Label>
              <Input
                id="issue-issuing-body"
                value={issueForm.issuingBody}
                onChange={(e) => setIssueForm((f) => ({ ...f, issuingBody: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="issue-issuedate">Tanggal Terbit</Label>
              <Input
                id="issue-issuedate"
                type="date"
                value={issueForm.issueDate}
                onChange={(e) => setIssueForm((f) => ({ ...f, issueDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="issue-validfrom">Berlaku Sejak</Label>
              <Input
                id="issue-validfrom"
                type="date"
                value={issueForm.validFrom}
                onChange={(e) => setIssueForm((f) => ({ ...f, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="issue-expiry">Tanggal Berakhir</Label>
              <Input
                id="issue-expiry"
                type="date"
                value={issueForm.expiryDate}
                onChange={(e) => setIssueForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue-pic">PIC</Label>
              <Input
                id="issue-pic"
                value={issueForm.pic}
                onChange={(e) => setIssueForm((f) => ({ ...f, pic: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="issue-pic-email">Email PIC</Label>
              <Input
                id="issue-pic-email"
                type="email"
                value={issueForm.picEmail}
                onChange={(e) => setIssueForm((f) => ({ ...f, picEmail: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="issue-doc">Dokumen Sertifikat</Label>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleIssueFileChange(e.target.files?.[0])}
              />
              <span className="flex items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:border-accent hover:bg-accent/5">
                <Upload className="h-4 w-4" />
                {issueUploading ? "Mengunggah..." : issueFileName || "Klik untuk unggah file (PDF/JPG/PNG)"}
              </span>
            </label>
            {issueUploading && (
              <div className="mt-2">
                <UploadProgressBar />
              </div>
            )}
          </div>

          {issueError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {issueError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleIssueCertificate} isLoading={issueSaving}>
              <Award className="h-4 w-4" />
              Terbitkan & Selesaikan Permohonan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
