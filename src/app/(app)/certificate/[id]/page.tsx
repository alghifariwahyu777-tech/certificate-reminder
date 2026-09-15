import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CertificateRenewalSection } from "@/components/certificate/RenewalHistory";
import { SurveillanceSection } from "@/components/certificate/SurveillanceSection";
import { getDaysRemaining } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { Pencil, Download, ArrowLeft, FileWarning } from "lucide-react";

export default async function CertificateDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const [certificate, renewals, surveillances] = await Promise.all([
    prisma.certificate.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { category: true, client: true, department: true },
    }),
    prisma.renewal.findMany({ where: { certificateId: params.id }, orderBy: { renewalDate: "desc" } }),
    prisma.surveillance.findMany({ where: { certificateId: params.id }, orderBy: { sequenceNumber: "asc" } }),
  ]);

  if (!certificate) notFound();

  const days = getDaysRemaining(certificate.expiryDate);
  const isImage = certificate.fileMimeType?.startsWith("image/") ?? false;

  const fields: { label: string; value: string }[] = [
    { label: "Nomor Sertifikat", value: certificate.certificateNumber },
    { label: "Nama Sertifikat", value: certificate.certificateName },
    { label: "Klien", value: certificate.client.name },
    { label: "Kategori", value: certificate.category.name },
    { label: "Divisi", value: certificate.department?.name || "-" },
    { label: "Instansi Penerbit", value: certificate.issuingBody || "-" },
    { label: "PIC", value: certificate.pic },
    { label: "Email PIC", value: certificate.picEmail || "-" },
    { label: "CC Email", value: certificate.ccEmail || "-" },
    { label: "Tanggal Terbit", value: formatDate(certificate.issueDate) },
    { label: "Tanggal Berlaku", value: certificate.validFrom ? formatDate(certificate.validFrom) : "-" },
    { label: "Tanggal Expired", value: formatDate(certificate.expiryDate) },
    { label: "Sisa Hari", value: days < 0 ? `Terlambat ${Math.abs(days)} hari` : `${days} hari lagi` },
    { label: "Lokasi Penyimpanan", value: certificate.storageLocation || "-" },
  ];

  return (
    <>
      <Navbar title="Detail Sertifikat" subtitle={certificate.certificateNumber} adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/certificate" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Certificate
          </Link>
          {session?.role === "ADMIN" && (
            <Link href={`/certificate/edit/${certificate.id}`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{certificate.certificateName}</CardTitle>
              <p className="text-sm text-slate-500 font-mono mt-1">{certificate.certificateNumber}</p>
            </div>
            <StatusBadge expiryDate={certificate.expiryDate} />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{f.label}</p>
                <p className="text-sm text-ink font-medium">{f.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {(certificate.description || certificate.notes) && (
          <Card>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {certificate.description && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{certificate.description}</p>
                </div>
              )}
              {certificate.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Catatan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{certificate.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dokumen Sertifikat</CardTitle>
            {certificate.fileUrl && (
              <a href={`${certificate.fileUrl}?download=1`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            {certificate.fileUrl ? (
              isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={certificate.fileUrl}
                  alt={`Dokumen ${certificate.certificateName}`}
                  className="w-full max-h-[70vh] object-contain rounded border border-slate-200 bg-slate-50"
                />
              ) : (
                <iframe
                  src={certificate.fileUrl}
                  title="Preview Dokumen Sertifikat"
                  className="w-full h-[70vh] rounded border border-slate-200"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                <FileWarning className="h-6 w-6" />
                <p className="text-sm">Belum ada dokumen yang diunggah untuk sertifikat ini.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <CertificateRenewalSection
          certificateId={certificate.id}
          currentNumber={certificate.certificateNumber}
          canManage={session?.role === "ADMIN"}
          initialRenewals={renewals.map((r) => ({
            ...r,
            renewalDate: r.renewalDate.toISOString(),
            previousExpiryDate: r.previousExpiryDate.toISOString(),
            newValidFrom: r.newValidFrom ? r.newValidFrom.toISOString() : null,
            newExpiryDate: r.newExpiryDate.toISOString(),
            createdAt: r.createdAt.toISOString(),
          }))}
        />

        {surveillances.length > 0 && (
          <SurveillanceSection
            certificateId={certificate.id}
            canManage={session?.role === "ADMIN"}
            initialSurveillances={surveillances.map((s) => ({
              id: s.id,
              sequenceNumber: s.sequenceNumber,
              scheduledDate: s.scheduledDate.toISOString(),
              status: s.status,
              completedDate: s.completedDate?.toISOString() || null,
              picName: s.picName,
              notes: s.notes,
              result: s.result,
            }))}
          />
        )}
      </div>
    </>
  );
}
