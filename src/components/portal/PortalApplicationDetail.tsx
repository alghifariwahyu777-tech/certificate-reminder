"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Eye, CheckCircle2, AlertTriangle, MinusCircle, Send, Workflow, Circle, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/lib/application";

type ApplicationInfo = {
  id: string;
  applicationNumber: string;
  status: string;
  contactName: string;
  contactPosition: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  createdAt: string;
  submittedAt: string | null;
  service: { id: string; name: string; code: string };
};

type RequirementInfo = {
  id: string;
  documentTypeName: string;
  mandatory: boolean;
  allowedFileTypes: string;
  maxFileSizeMB: number;
};

type DocumentInfo = {
  id: string;
  version: number;
  fileUrl: string;
  status: string;
  reviewComment: string | null;
};

type StageInfo = {
  id: string;
  name: string;
  clientDescription: string | null;
  sequence: number;
  status: string;
  completedDate: string | null;
};

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

export function PortalApplicationDetail({
  application,
  requirements,
  documentsByRequirement,
  stages,
  certificate,
}: {
  application: ApplicationInfo;
  requirements: RequirementInfo[];
  documentsByRequirement: Record<string, DocumentInfo>;
  stages: StageInfo[];
  certificate: { id: string; certificateNumber: string; expiryDate: string } | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState(documentsByRequirement);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditable = application.status === "DRAFT" || application.status === "REVISION_REQUIRED";

  async function handleFileChange(requirementId: string, file: File | undefined) {
    if (!file) return;
    setUploadingId(requirementId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("serviceRequirementId", requirementId);
      const res = await fetch(`/api/portal/applications/${application.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal mengunggah dokumen.", "error");
        return;
      }
      setDocuments((prev) => ({ ...prev, [requirementId]: body.document }));
      showToast("Dokumen berhasil diunggah.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/applications/${application.id}/submit`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.message || "Gagal mengajukan permohonan.");
        return;
      }
      showToast("Permohonan berhasil diajukan.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const missingMandatory = requirements.filter((r) => r.mandatory && !documents[r.id]);

  return (
    <div className="p-5 md:p-8 max-w-2xl space-y-5">
      <Link
        href="/portal/applications"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pengajuan Saya
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{application.service.name}</CardTitle>
            <p className="text-xs text-slate-400 font-mono mt-1">{application.applicationNumber}</p>
          </div>
          <span className={`stamp-badge ${APPLICATION_STATUS_COLORS[application.status]}`}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </span>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Kontak:</span> {application.contactName}
            {application.contactPosition ? ` (${application.contactPosition})` : ""}
          </p>
          {application.contactEmail && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Email:</span> {application.contactEmail}
            </p>
          )}
          {application.contactPhone && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Telepon:</span> {application.contactPhone}
            </p>
          )}
          {application.description && (
            <p className="text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Catatan:</span> {application.description}
            </p>
          )}
          <p className="text-xs text-slate-400 pt-1">
            Dibuat {formatDate(application.createdAt)}
            {application.submittedAt ? ` · Diajukan ${formatDate(application.submittedAt)}` : ""}
          </p>
        </CardContent>
      </Card>

      {certificate && (
        <div className="flex items-center gap-2.5 rounded-md border border-signal-activeBorder bg-signal-activeBg px-4 py-3 text-sm text-signal-active">
          <Award className="h-4 w-4 shrink-0" />
          <span>
            Sertifikat <strong>{certificate.certificateNumber}</strong> telah diterbitkan — berlaku hingga{" "}
            {formatDate(certificate.expiryDate)}.
          </span>
          <Link href="/portal/certificates" className="ml-auto underline font-medium shrink-0">
            Lihat di Sertifikat Saya
          </Link>
        </div>
      )}

      {stages.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Workflow className="h-4 w-4 text-slate-400" />
            <CardTitle>Progress Sertifikasi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stages.map((s) => (
                <div key={s.id} className="flex items-start gap-3 px-5 py-3.5">
                  {s.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-5 w-5 text-signal-active shrink-0 mt-0.5" />
                  ) : s.status === "IN_PROGRESS" ? (
                    <div className="h-5 w-5 rounded-full bg-signal-soon shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        s.status === "PENDING" ? "text-slate-400" : "text-ink dark:text-slate-100"
                      }`}
                    >
                      {s.name}
                    </p>
                    {s.clientDescription && (
                      <p className="text-xs text-slate-500 mt-0.5">{s.clientDescription}</p>
                    )}
                    {s.completedDate && (
                      <p className="text-xs text-slate-400 mt-0.5">Selesai {formatDate(s.completedDate)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklist Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requirements.map((r) => {
              const doc = documents[r.id];
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink dark:text-slate-100">{r.documentTypeName}</p>
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
                          {doc.status === "REVISION_REQUIRED" && (
                            <AlertTriangle className="h-3.5 w-3.5 text-signal-expired" />
                          )}
                          {doc.status === "UPLOADED" && <MinusCircle className="h-3.5 w-3.5 text-accent" />}
                          <span className={`stamp-badge ${DOC_STATUS_COLORS[doc.status]}`}>
                            {DOC_STATUS_LABELS[doc.status]} (v{doc.version})
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Belum diunggah</p>
                      )}
                      {doc?.status === "REVISION_REQUIRED" && doc.reviewComment && (
                        <p className="text-xs text-signal-expired mt-1.5 bg-signal-expiredBg rounded px-2 py-1">
                          Catatan reviewer: {doc.reviewComment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent"
                          aria-label="Lihat dokumen"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      {isEditable && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleFileChange(r.id, e.target.files?.[0])}
                          />
                          <span className="inline-flex items-center gap-1.5 rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-ink dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800">
                            {uploadingId === r.id ? (
                              "Mengunggah..."
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                {doc ? "Ganti" : "Unggah"}
                              </>
                            )}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isEditable && (
        <Card>
          <CardContent className="space-y-3">
            {missingMandatory.length > 0 && (
              <p className="text-xs text-slate-500">
                {missingMandatory.length} dokumen wajib belum diunggah: {missingMandatory.map((r) => r.documentTypeName).join(", ")}
              </p>
            )}
            {submitError && (
              <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
                {submitError}
              </div>
            )}
            <Button onClick={handleSubmit} isLoading={submitting}>
              <Send className="h-4 w-4" />
              {application.status === "REVISION_REQUIRED" ? "Ajukan Ulang" : "Ajukan Permohonan"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
