import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, FileText, Workflow, CalendarClock, Clock, ShieldCheck } from "lucide-react";

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

export default async function PortalServiceDetailPage({ params }: { params: { id: string } }) {
  const service = await prisma.service.findFirst({
    where: { id: params.id, isActive: true },
    include: {
      requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } },
      stages: { where: { clientVisible: true }, orderBy: { sequence: "asc" } },
    },
  });

  if (!service) notFound();

  return (
    <div className="p-5 md:p-8 max-w-3xl space-y-5">
      <Link
        href="/portal/services"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Katalog Layanan
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{service.name}</CardTitle>
          <p className="text-xs text-slate-400 font-mono mt-1">{service.code}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {service.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{service.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {service.requiresAudit && (
              <span className="stamp-badge text-accent bg-accent/5 border-accent/20">
                <ShieldCheck className="h-3 w-3" /> Membutuhkan Audit
              </span>
            )}
            {service.requiresSurveillance && (
              <span className="stamp-badge text-signal-soon bg-signal-soonBg border-signal-soonBorder">
                <CalendarClock className="h-3 w-3" />
                Surveillance {service.surveillanceCount}x setiap {service.surveillanceIntervalMonths} bulan
              </span>
            )}
            {service.estimatedProcessingDays && (
              <span className="stamp-badge text-slate-500 bg-slate-100 border-slate-200">
                <Clock className="h-3 w-3" /> Estimasi ~{service.estimatedProcessingDays} hari kerja
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <CardTitle>Dokumen yang Perlu Disiapkan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {service.requirements.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada persyaratan dokumen tercantum.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {service.requirements.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm text-ink dark:text-slate-100">{r.documentType.name}</p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Workflow className="h-4 w-4 text-slate-400" />
          <CardTitle>Alur Proses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {service.stages.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada alur proses tercantum.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {service.stages.map((s) => (
                <div key={s.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="h-6 w-6 rounded-full bg-ink text-white text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                    {s.sequence}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.clientDescription || STAGE_TYPE_LABELS[s.stageType] || s.stageType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Untuk mengajukan layanan ini, silakan hubungi PIC Anda di PT Sucofindo (Persero). Fitur
        pengajuan online langsung dari portal akan segera hadir.
      </p>
    </div>
  );
}
