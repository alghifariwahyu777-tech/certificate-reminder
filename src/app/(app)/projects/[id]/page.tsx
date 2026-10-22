import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectAddendumSection } from "@/components/project/ProjectAddendumSection";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";
import { Pencil, Download, ArrowLeft, FileWarning } from "lucide-react";
import { getProjectWithMonitoring } from "@/lib/project-monitoring";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent } from "@/lib/project-monitoring-shared";
import { MonitoringTabs } from "@/components/project/monitoring/MonitoringTabs";
import { SummaryPanel } from "@/components/project/monitoring/SummaryPanel";
import { ProgressPanel } from "@/components/project/monitoring/ProgressPanel";
import { MilestonePanel } from "@/components/project/monitoring/MilestonePanel";
import { TermPanel } from "@/components/project/monitoring/TermPanel";
import { CostPanel } from "@/components/project/monitoring/CostPanel";
import { IssuePanel } from "@/components/project/monitoring/IssuePanel";
import { ProgressBar } from "@/components/project/monitoring/shared";
import type { ProjectMonitoringDTO } from "@/components/project/monitoring/types";

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

  const loaded = await getProjectWithMonitoring(params.id);
  if (!loaded) notFound();
  const { project, summary } = loaded;
  const canManage = session?.role === "ADMIN";
  const d = (v: Date | null) => (v ? v.toISOString().slice(0, 10) : null);
  const n = (v: { toString(): string } | null) => (v === null ? null : Number(v.toString()));

  const monitoring: ProjectMonitoringDTO = {
    projectId: project.id,
    status: project.status,
    contractValue: n(project.contractValue),
    startDate: d(project.startDate),
    targetEndDate: project.targetEndDate.toISOString(),
    canManage,
    today: loaded.today,
    input: loaded.input,
    summary,
    thresholds: loaded.thresholds,
    milestones: project.milestones.map((m) => ({
      id: m.id,
      sequence: m.sequence,
      name: m.name,
      description: m.description,
      weight: Number(m.weight),
      plannedDate: d(m.plannedDate),
      actualDate: d(m.actualDate),
      status: m.status,
      notes: m.notes,
      fileUrl: m.fileUrl,
      driveFileId: m.driveFileId,
      fileMimeType: m.fileMimeType,
    })),
    plans: project.progressPlans.map((p) => ({ periodDate: d(p.periodDate) as string, plannedPercent: Number(p.plannedPercent) })),
    reports: project.progressReports.map((r) => ({
      id: r.id,
      reportDate: d(r.reportDate) as string,
      actualPercent: Number(r.actualPercent),
      summary: r.summary,
      nextPlan: r.nextPlan,
      createdBy: r.createdBy,
      fileUrl: r.fileUrl,
      driveFileId: r.driveFileId,
      fileMimeType: r.fileMimeType,
    })),
    terms: project.terms.map((t) => ({
      id: t.id,
      sequence: t.sequence,
      name: t.name,
      percent: n(t.percent),
      amount: Number(t.amount),
      requirement: t.requirement,
      plannedDate: d(t.plannedDate),
      status: t.status,
      invoiceNumber: t.invoiceNumber,
      invoiceDate: d(t.invoiceDate),
      dueDate: d(t.dueDate),
      paidDate: d(t.paidDate),
      paidAmount: n(t.paidAmount),
      notes: t.notes,
      fileUrl: t.fileUrl,
      driveFileId: t.driveFileId,
      fileMimeType: t.fileMimeType,
    })),
    budgetItems: project.budgetItems.map((b) => ({ id: b.id, category: b.category, description: b.description, amount: Number(b.amount) })),
    expenses: project.expenses.map((e) => ({
      id: e.id,
      expenseDate: d(e.expenseDate) as string,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      createdBy: e.createdBy,
      fileUrl: e.fileUrl,
      driveFileId: e.driveFileId,
      fileMimeType: e.fileMimeType,
    })),
    issues: project.issues.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      impact: i.impact,
      owner: i.owner,
      targetDate: d(i.targetDate),
      status: i.status,
      resolution: i.resolution,
      closedAt: i.closedAt ? i.closedAt.toISOString() : null,
      createdBy: i.createdBy,
      createdAt: i.createdAt.toISOString(),
    })),
  };

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
      <div className="p-5 md:p-8 max-w-6xl space-y-5">
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
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="stamp-badge bg-blue-50 text-blue-700 border-blue-200">
                {STATUS_LABEL[project.status]}
              </span>
              <span className={`stamp-badge ${HEALTH_BADGE_CLASS[summary.health]}`}>{HEALTH_LABEL[summary.health]}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>
                Progres {formatPercent(summary.actualPercent)} · rencana {formatPercent(summary.plannedPercent)}
              </span>
              <span>
                {project.category.name} · {project.clientName}
              </span>
            </div>
            <ProgressBar value={summary.actualPercent} marker={summary.plannedPercent} />
          </CardContent>
        </Card>

        <MonitoringTabs
          badges={{
            kendala: summary.openHighIssues || undefined,
            termin: summary.overdueInvoiceCount || undefined,
          }}
          panels={{
            ringkasan: <SummaryPanel data={monitoring} />,
            progres: <ProgressPanel data={monitoring} />,
            milestone: <MilestonePanel data={monitoring} />,
            termin: <TermPanel data={monitoring} />,
            biaya: <CostPanel data={monitoring} />,
            kendala: <IssuePanel data={monitoring} />,
            kontrak: (
        <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Data Kontrak</CardTitle>
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
            ),
          }}
        />
      </div>
    </>
  );
}
