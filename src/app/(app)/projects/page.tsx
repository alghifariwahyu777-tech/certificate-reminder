import { CheckCircle2, FolderKanban, Timer, Wallet } from "lucide-react";
import { ensureDemoDataOnce } from "@/lib/demo-data";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectListClient } from "@/components/project/ProjectListClient";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { formatRupiah as formatRupiahShort } from "@/lib/project-monitoring-shared";
import { CostImportDialog } from "@/components/project/monitoring/CostImportDialog";
import { DemoSeeder } from "@/components/project/monitoring/DemoSeeder";
import { PageBody } from "@/components/layout/PageBody";
import { StatCard, StatGrid } from "@/components/ui/Stat";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function ProjectsPage() {
  const session = await getSession();
  const demo = await ensureDemoDataOnce();
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
      <Navbar title="Daftar Project" subtitle="Daftar seluruh project" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        {demo.state === "pending" && <DemoSeeder present={demo.present ?? 0} total={demo.total ?? 0} />}
        <StatGrid>
          <StatCard icon={ENTITY_ICON.project} label="Project berjalan" value={ongoing.length.toLocaleString("id-ID")} sub={`Dari ${projects.length} project tercatat`} href="/projects/dashboard" />
          <StatCard icon={Wallet} label="Nilai kontrak berjalan" value={formatRupiahShort(runningContractValue, true)} hint={formatRupiah(runningContractValue)} tone="accent" sub="Total nilai project berjalan" />
          <StatCard icon={CheckCircle2} label="Project selesai" value={completed.length.toLocaleString("id-ID")} tone={completed.length ? "good" : "default"} sub="Status selesai" />
          <StatCard icon={Timer} label="Rata-rata lama pengerjaan" value={avgDays ? `${avgDays} hari` : "-"} sub="Project selesai dengan tanggal lengkap" />
        </StatGrid>

        <ProjectListClient
          canManage={session?.role === "ADMIN"}
          extraActions={
            <>
              {session?.role === "ADMIN" && (
                <div>
                  <CostImportDialog label="Impor biaya (Excel)" size="md" />
                </div>
              )}
            </>
          }
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
      </PageBody>
    </>
  );
}
