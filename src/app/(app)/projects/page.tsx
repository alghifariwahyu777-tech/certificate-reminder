import { ensureDemoDataOnce } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectListClient } from "@/components/project/ProjectListClient";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { CostImportDialog } from "@/components/project/monitoring/CostImportDialog";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function ProjectsPage() {
  const session = await getSession();
  await ensureDemoDataOnce();
  const [projects, categories, portfolio] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { targetEndDate: "asc" },
    }),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
    getProjectPortfolio(),
  ]);
  const summaryById = new Map(portfolio.rows.map((r) => [r.id, r.summary]));

  const toNumber = (v: unknown) => (v ? Number(v) : 0);
  const ongoing = projects.filter((p) => p.status === "ONGOING");
  const completed = projects.filter((p) => p.status === "COMPLETED");

  const runningContractValue = ongoing.reduce((sum, p) => sum + toNumber(p.contractValue), 0);

  const completedWithDuration = completed.filter((p) => p.startDate && p.actualEndDate);
  const avgDays =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, p) => {
            const days = (p.actualEndDate!.getTime() - p.startDate!.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedWithDuration.length
        )
      : 0;

  return (
    <>
      <Navbar title="Daftar Project" subtitle="Kelola data project: tambah, ubah, atau hapus" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
            {ongoing.length} project berjalan senilai <strong className="text-ink dark:text-slate-100">{formatRupiah(runningContractValue)}</strong>, {completed.length} project selesai
            {avgDays ? ` (rata-rata ${avgDays} hari pengerjaan)` : ""}. Untuk melihat kondisi dan hal yang perlu ditindaklanjuti, buka Monitoring Project.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            {session?.role === "ADMIN" && <CostImportDialog label="Impor biaya (Excel)" />}
            <Link href="/projects/dashboard">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4" />
                Monitoring Project
              </Button>
            </Link>
          </div>
        </div>

        <ProjectListClient
          canManage={session?.role === "ADMIN"}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialProjects={projects.map((p) => ({
            id: p.id,
            projectNumber: p.projectNumber,
            projectName: p.projectName,
            categoryName: p.category.name,
            clientName: p.clientName,
            pic: p.pic,
            targetEndDate: p.targetEndDate.toISOString(),
            status: p.status as "ONGOING" | "COMPLETED" | "CANCELLED",
            contractValue: p.contractValue?.toString() || null,
            actualPercent: summaryById.get(p.id)?.actualPercent ?? 0,
            plannedPercent: summaryById.get(p.id)?.plannedPercent ?? 0,
            health: summaryById.get(p.id)?.health ?? "ON_TRACK",
          }))}
        />
      </div>
    </>
  );
}
