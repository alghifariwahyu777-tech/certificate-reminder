import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectAddendumSection } from "@/components/project/ProjectAddendumSection";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";
import { Pencil, Download, ArrowLeft, FileWarning } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };

function formatRupiah(value: string | null | undefined) {
  if (!value) return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export default async function ProjectDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  const project = await prisma.project.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, addenda: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();

  const days = getDaysRemaining(project.targetEndDate);

  const fields: { label: string; value: string }[] = [
    { label: "Kategori", value: project.category.name },
    { label: "Klien / Pemberi Kerja", value: project.clientName },
    { label: "PIC", value: project.pic },
    { label: "Email PIC", value: project.picEmail || "-" },
    { label: "Email CC (Atasan)", value: project.ccEmail || "-" },
    { label: "Nilai Kontrak", value: formatRupiah(project.contractValue?.toString()) },
    { label: "Tanggal Mulai", value: project.startDate ? formatDate(project.startDate) : "-" },
    { label: "Target Selesai", value: formatDate(project.targetEndDate) },
    {
      label: "Sisa Hari",
      value:
        project.status !== "ONGOING"
          ? "-"
          : days < 0
            ? `Terlambat ${Math.abs(days)} hari`
            : `${days} hari lagi`,
    },
    { label: "Tanggal Selesai Aktual", value: project.actualEndDate ? formatDate(project.actualEndDate) : "-" },
  ];

  return (
    <>
      <Navbar
        title="Project Detail"
        subtitle={project.projectNumber}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Project Monitoring
          </Link>
          {session?.role === "ADMIN" && (
            <Link href={`/projects/${project.id}/edit`}>
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
              <CardTitle className="text-xl">{project.projectName}</CardTitle>
              <p className="text-sm text-slate-500 font-mono mt-1">{project.projectNumber}</p>
            </div>
            <span className="stamp-badge bg-blue-50 text-blue-700 border-blue-200">
              {STATUS_LABEL[project.status]}
            </span>
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

        {(project.description || project.notes) && (
          <Card>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Deskripsi / Lingkup</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{project.description}</p>
                </div>
              )}
              {project.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Catatan</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{project.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <ProjectAddendumSection
          projectId={project.id}
          canManage={session?.role === "ADMIN"}
          initialAddenda={project.addenda.map((a) => ({
            id: a.id,
            addendumNumber: a.addendumNumber,
            description: a.description,
            previousEndDate: a.previousEndDate.toISOString(),
            newTargetEndDate: a.newTargetEndDate.toISOString(),
            newContractValue: a.newContractValue?.toString() || null,
            createdAt: a.createdAt.toISOString(),
            createdBy: a.createdBy,
          }))}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dokumen Kontrak</CardTitle>
            {project.fileUrl && (
              <a href={`${project.fileUrl}?download=1`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            {!project.fileUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <FileWarning className="h-8 w-8" />
                <p className="text-sm">Belum ada dokumen yang diunggah.</p>
              </div>
            ) : project.fileMimeType?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.fileUrl}
                alt={project.projectName}
                className="max-h-[600px] mx-auto rounded border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <iframe src={project.fileUrl} className="w-full h-[600px] rounded border border-slate-200 dark:border-slate-700" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
