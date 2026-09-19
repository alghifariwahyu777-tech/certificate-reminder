import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";
import { Pencil, Download, ArrowLeft, FileWarning } from "lucide-react";

export default async function PersonnelCertificationDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  const certification = await prisma.personnelCertification.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { employee: { include: { department: true } }, category: true },
  });

  if (!certification) notFound();

  const days = getDaysRemaining(certification.expiryDate);
  const isImage = certification.fileMimeType?.startsWith("image/") ?? false;

  const fields: { label: string; value: string }[] = [
    { label: "Personil", value: certification.employee.name },
    { label: "Jabatan", value: certification.employee.position || "-" },
    { label: "Divisi", value: certification.employee.department?.name || "-" },
    { label: "Email Personil", value: certification.employee.email },
    { label: "Kategori", value: certification.category.name },
    { label: "Nomor Sertifikasi", value: certification.certificationNumber || "-" },
    { label: "Instansi Penerbit", value: certification.issuingBody || "-" },
    { label: "Email CC (Atasan/HR)", value: certification.ccEmail || "-" },
    { label: "Tanggal Terbit", value: certification.issueDate ? formatDate(certification.issueDate) : "-" },
    { label: "Berlaku Sejak", value: certification.validFrom ? formatDate(certification.validFrom) : "-" },
    { label: "Tanggal Berakhir", value: formatDate(certification.expiryDate) },
    { label: "Sisa Hari", value: days < 0 ? `Terlambat ${Math.abs(days)} hari` : `${days} hari lagi` },
  ];

  return (
    <>
      <Navbar
        title="Detail Sertifikasi Personil"
        subtitle={certification.certificationNumber || certification.certificationName}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/personnel-certifications"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Sertifikasi Personil
          </Link>
          {session?.role === "ADMIN" && (
            <Link href={`/personnel-certifications/${certification.id}/edit`}>
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
              <CardTitle className="text-xl">{certification.certificationName}</CardTitle>
              <p className="text-sm text-slate-500 font-mono mt-1">
                {certification.certificationNumber || "Tanpa nomor"}
              </p>
            </div>
            <StatusBadge expiryDate={certification.expiryDate} />
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

        {certification.notes && (
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Catatan</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{certification.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dokumen Sertifikasi</CardTitle>
            {certification.fileUrl && (
              <a href={`${certification.fileUrl}?download=1`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            {!certification.fileUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <FileWarning className="h-8 w-8" />
                <p className="text-sm">Belum ada dokumen yang diunggah.</p>
              </div>
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={certification.fileUrl}
                alt={certification.certificationName}
                className="max-h-[600px] mx-auto rounded border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <iframe src={certification.fileUrl} className="w-full h-[600px] rounded border border-slate-200 dark:border-slate-700" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
