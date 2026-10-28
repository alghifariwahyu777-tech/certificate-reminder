import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectAddendumSection } from "@/components/project/ProjectAddendumSection";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";
import { Pencil, Download, ArrowLeft, FileWarning, TrendingUp } from "lucide-react";
import { deviationTrend, getProjectWithMonitoring } from "@/lib/project-monitoring";
import { PROJECT_COST_CATEGORIES, formatRupiah as formatRupiahShared, padSchedule } from "@/lib/project-monitoring-shared";
import { buildCostCurve, buildProfitLoss, marginTimeline } from "@/lib/project-margin";
import { prisma } from "@/lib/prisma";
import { summarizeHse, toHseRecord } from "@/lib/project-hse";
import { HsePanel } from "@/components/project/monitoring/HsePanel";
import { certWarnings } from "@/lib/personnel-mapping";
import { TeamPanel } from "@/components/project/monitoring/TeamPanel";
import { CloseoutPanel } from "@/components/project/monitoring/CloseoutPanel";
import { MarginPanel } from "@/components/project/monitoring/MarginPanel";
import { MonitoringTabs } from "@/components/project/monitoring/MonitoringTabs";
import { SummaryPanel } from "@/components/project/monitoring/SummaryPanel";
import { ProgressPanel } from "@/components/project/monitoring/ProgressPanel";
import { MilestonePanel } from "@/components/project/monitoring/MilestonePanel";
import { TermPanel } from "@/components/project/monitoring/TermPanel";
import { CostPanel } from "@/components/project/monitoring/CostPanel";
import { IssuePanel } from "@/components/project/monitoring/IssuePanel";
import type { ProjectMonitoringDTO } from "@/components/project/monitoring/types";
import type { RabData } from "@/lib/project-rab-import";
import { DeviationChart } from "@/components/project/monitoring/DeviationChart";

const STATUS_LABEL: Record<string, string> = { ONGOING: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };

function formatRupiahCompact(value: number | null) {
  return value ? formatRupiahShared(value, true) : "-";
}

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

  // Team: certifications + SDB load (running projects per person) for everyone on this project.
  const memberIds = [...new Set(project.assignments.map((a) => a.employeeId))];
  const [memberDetails, employees] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        certifications: { select: { certificationName: true, expiryDate: true, deletedAt: true } },
        assignments: { where: { project: { deletedAt: null, status: "ONGOING" } }, select: { projectId: true } },
      },
    }),
    canManage
      ? prisma.employee.findMany({ where: { isActive: true }, select: { id: true, name: true, employeeId: true, position: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);
  const detailById = new Map(memberDetails.map((e) => [e.id, e]));
  // category names already used anywhere, so every project's list grows with the organisation's own vocabulary
  const usedCategories = await prisma.$queryRaw<{ category: string }[]>`
    SELECT DISTINCT category FROM "ProjectExpense" UNION SELECT DISTINCT category FROM "ProjectBudgetItem" LIMIT 300`;
  const todayDate = new Date(loaded.today);
  const latestRab = project.rabRevisions[0]
    ? await prisma.projectRabRevision.findUnique({ where: { id: project.rabRevisions[0].id }, select: { dataJson: true } })
    : null;
  const parsedRab = (() => {
    try {
      return latestRab ? (JSON.parse(latestRab.dataJson) as RabData) : null;
    } catch {
      return null;
    }
  })();

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
      cause: e.cause,
      referenceNo: e.referenceNo,
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
      likelihood: i.likelihood,
      category: i.category,
      owner: i.owner,
      targetDate: d(i.targetDate),
      status: i.status,
      resolution: i.resolution,
      closedAt: i.closedAt ? i.closedAt.toISOString() : null,
      createdBy: i.createdBy,
      createdAt: i.createdAt.toISOString(),
    })),
    hse: {
      records: project.hseReports.map((h) => ({ ...toHseRecord(h), id: h.id, periodDate: h.periodDate.toISOString().slice(0, 10), notes: h.notes, createdBy: h.createdBy })),
      summary: summarizeHse(project.hseReports.map(toHseRecord)),
    },
    trend: project.status === "ONGOING" ? deviationTrend(project, summary.deviation) : null,
    padSchedule: padSchedule(loaded.input, loaded.today, loaded.thresholds),
    snapshots: project.snapshots.map((x) => ({
      weekKey: x.weekKey,
      actualPercent: x.actualPercent,
      plannedPercent: x.plannedPercent,
      deviation: x.deviation,
    })),
    closeout: project.closeout
      ? {
          bappDate: d(project.closeout.bappDate),
          bastDate: d(project.closeout.bastDate),
          finalReportDate: d(project.closeout.finalReportDate),
          satisfaction: project.closeout.satisfaction,
          lessonsLearned: project.closeout.lessonsLearned,
          notes: project.closeout.notes,
          fileUrl: project.closeout.fileUrl,
          driveFileId: project.closeout.driveFileId,
          fileMimeType: project.closeout.fileMimeType,
          updatedBy: project.closeout.updatedBy,
          updatedAt: project.closeout.updatedAt.toISOString(),
        }
      : null,
    team: project.assignments.map((a) => {
      const det = detailById.get(a.employeeId);
      const until = a.endDate ?? project.targetEndDate;
      return {
        id: a.id,
        employeeId: a.employeeId,
        name: a.employee.name,
        nip: a.employee.employeeId,
        position: a.employee.position,
        role: a.role,
        startDate: d(a.startDate),
        endDate: d(a.endDate),
        notes: a.notes,
        activeProjects: new Set(det?.assignments.map((x) => x.projectId) ?? []).size,
        warnings: project.status === "ONGOING" && det ? certWarnings(det.certifications, until, todayDate) : [],
      };
    }),
    employees: employees.map((e) => ({ id: e.id, name: e.name, nip: e.employeeId, position: e.position })),
    margin: loaded.margin,
    costCurve: buildCostCurve(loaded.input, summary, loaded.margin, loaded.today),
    marginTimeline: marginTimeline(loaded.input, loaded.today),
    categorySuggestions: [...new Set([...PROJECT_COST_CATEGORIES, ...usedCategories.map((c) => c.category)])].sort((a, b) => a.localeCompare(b)),
    baseline: project.baselineLockedAt
      ? {
          lockedAt: project.baselineLockedAt.toISOString(),
          lockedBy: project.baselineLockedBy,
          contractValue: n(project.baselineContractValue),
          budget: n(project.baselineBudget),
          endDate: d(project.baselineEndDate),
        }
      : null,
    marginHistory: project.snapshots.map((x) => ({
      weekKey: x.weekKey,
      actualMarginPct: x.actualMarginPct,
      forecastMarginPct: x.forecastMarginPct,
      plannedMarginPct: x.plannedMarginPct,
    })),
    rab: {
      latest: parsedRab,
      revisions: project.rabRevisions.map((r) => ({
        id: r.id,
        version: r.version,
        reason: r.reason,
        fileName: r.fileName,
        contractValue: n(r.contractValue),
        totalCost: Number(r.totalCost),
        operatingProfit: n(r.operatingProfit),
        marginPct: r.marginPct,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
      })),
    },
    targetMarginPct: project.targetMarginPct,
    pnl: buildProfitLoss(loaded.input, summary, loaded.margin, loaded.today, parsedRab?.years ?? []),
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

  const kontrak = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data kontrak</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-[12.5px] text-slate-500">{f.label}</p>
              <p className="text-sm font-medium text-ink dark:text-slate-100">{f.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {(project.description || project.notes) && (
        <Card>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <p className="mb-1.5 text-[12.5px] text-slate-500">Deskripsi / lingkup</p>
                <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{project.description}</p>
              </div>
            )}
            {project.notes && (
              <div>
                <p className="mb-1.5 text-[12.5px] text-slate-500">Catatan</p>
                <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{project.notes}</p>
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
          <CardTitle>Dokumen kontrak</CardTitle>
          {project.fileUrl && (
            <a href={`${project.fileUrl}?download=1`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Unduh
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
            <img src={project.fileUrl} alt={project.projectName} className="mx-auto max-h-[600px] rounded border border-line dark:border-slate-700" />
          ) : (
            <iframe src={project.fileUrl} className="h-[600px] w-full rounded border border-line dark:border-slate-700" />
          )}
        </CardContent>
      </Card>
    </div>
  );

  const startMs = (project.startDate ?? project.createdAt).getTime();
  const endMs = (project.actualEndDate ?? project.targetEndDate).getTime();
  const durationDays = Math.max(1, Math.round((project.targetEndDate.getTime() - startMs) / 86400000));
  const elapsed = Math.min(100, Math.max(0, summary.timeElapsedPercent));
  const meta: { k: string; v: string; sub?: string }[] = [
    { k: "Klien", v: project.clientName },
    { k: "Nilai kontrak", v: formatRupiahCompact(n(project.contractValue)) },
    { k: "PIC", v: project.pic },
    { k: "Tanggal mulai", v: formatDate(project.startDate ?? project.createdAt), sub: project.startDate ? undefined : "tanggal project dibuat" },
    {
      k: project.actualEndDate ? "Selesai aktual" : "Target selesai",
      v: formatDate(new Date(endMs)),
      sub: project.status === "ONGOING" ? (summary.daysRemaining >= 0 ? `${summary.daysRemaining} hari lagi` : `terlambat ${Math.abs(summary.daysRemaining)} hari`) : undefined,
    },
    { k: "Durasi", v: `${durationDays.toLocaleString("id-ID")} hari`, sub: project.status === "ONGOING" ? `${Math.round(elapsed)}% waktu berjalan` : undefined },
  ];

  return (
    <>
      <Navbar title="Monitoring Project" subtitle={project.projectNumber} adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="space-y-5 p-5 md:p-8">
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 px-5 pb-4 pt-4 md:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Link href="/projects/dashboard" className="inline-flex items-center gap-1 text-[12.5px] text-slate-500 hover:text-ink dark:hover:text-slate-200">
                <ArrowLeft className="h-3.5 w-3.5" />
                Monitoring Project
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-[22px] font-bold leading-tight text-ink md:text-[24px] dark:text-slate-100">{project.projectName}</h1>
                <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[12px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">
                {project.projectNumber} · {project.category.name}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={`/api/projects/${project.id}/report`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Laporan project (PDF)
                </Button>
              </a>
              {session?.role === "ADMIN" && (
                <>
                  <Link href={`/projects/${project.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Edit project
                    </Button>
                  </Link>
                  {project.status === "ONGOING" && (
                    <a href="#jadwal/progres/baru">
                      <Button size="sm">
                        <TrendingUp className="h-4 w-4" />
                        Update progres
                      </Button>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t border-line bg-paper/60 sm:grid-cols-3 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-800/30">
            {meta.map((x) => (
              <div key={x.k} className="min-w-0 border-b border-r border-line px-5 py-3 md:px-6 xl:border-b-0 dark:border-slate-800">
                <dt className="text-[12px] text-slate-500">{x.k}</dt>
                <dd className="mt-0.5 truncate text-[14px] font-semibold text-ink dark:text-slate-100" title={x.v}>
                  {x.v}
                </dd>
                {x.k === "Durasi" && project.status === "ONGOING" ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-brand-blueDark dark:bg-slate-300" style={{ width: `${elapsed}%` }} />
                    </div>
                    <span className="text-[11.5px] text-slate-500">{Math.round(elapsed)}%</span>
                  </div>
                ) : (
                  x.sub && <p className={x.sub.startsWith("terlambat") ? "text-[11.5px] font-semibold text-signal-expired" : "text-[11.5px] text-slate-500"}>{x.sub}</p>
                )}
              </div>
            ))}
          </dl>
        </section>

        <MonitoringTabs
          panels={{
            ringkasan: <SummaryPanel data={monitoring} />,
            jadwal: [
              {
                key: "progres",
                label: "Progres",
                node: (
                  <div className="space-y-4">
                    <ProgressPanel data={monitoring} />
                    <Card>
                      <CardHeader>
                        <CardTitle>Deviasi progres sejak project dimulai</CardTitle>
                        <p className="mt-0.5 text-[12.5px] text-slate-500">Realisasi dikurangi rencana pada setiap periode. Hijau: sesuai atau mendahului rencana, kuning: tertinggal, merah: tertinggal lebih dari 5 poin.</p>
                      </CardHeader>
                      <CardContent>
                        <DeviationChart input={monitoring.input} today={monitoring.today} />
                      </CardContent>
                    </Card>
                  </div>
                ),
              },
              { key: "milestone", label: "Milestone", node: <MilestonePanel data={monitoring} /> },
            ],
            keuangan: [
              { key: "margin", label: "Margin", node: <MarginPanel data={monitoring} /> },
              { key: "biaya", label: "RAB & biaya", node: <CostPanel data={monitoring} /> },
              { key: "termin", label: "Termin & penagihan", badge: summary.overdueInvoiceCount || undefined, node: <TermPanel data={monitoring} /> },
            ],
            tim: [
              { key: "kendala", label: "Kendala & risiko", badge: summary.openHighIssues || undefined, node: <IssuePanel data={monitoring} /> },
              { key: "hse", label: "HSE", badge: monitoring.hse.summary.signal === "bad" ? 1 : undefined, node: <HsePanel data={monitoring} /> },
              { key: "personil", label: "Tim", badge: monitoring.team.filter((m) => m.warnings.some((w) => w.expired)).length || undefined, node: <TeamPanel data={monitoring} /> },
            ],
            dokumen: [
              { key: "kontrak", label: "Kontrak & addendum", node: kontrak },
              { key: "penutupan", label: "Penutupan", node: <CloseoutPanel data={monitoring} /> },
            ],
          }}
        />
      </div>
    </>
  );
}
