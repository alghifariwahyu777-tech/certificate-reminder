import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectListClient } from "@/components/project/ProjectListClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Wallet, TrendingUp, CheckCircle2, Gauge } from "lucide-react";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function ProjectsPage() {
  const session = await getSession();
  const [projects, categories] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { targetEndDate: "asc" },
    }),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const toNumber = (v: unknown) => (v ? Number(v) : 0);
  const ongoing = projects.filter((p) => p.status === "ONGOING");
  const completed = projects.filter((p) => p.status === "COMPLETED");

  const totalContractValue = projects.reduce((sum, p) => sum + toNumber(p.contractValue), 0);
  const runningContractValue = ongoing.reduce((sum, p) => sum + toNumber(p.contractValue), 0);
  const completedContractValue = completed.reduce((sum, p) => sum + toNumber(p.contractValue), 0);

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

  const summaryCards = [
    {
      label: "Total Nilai Kontrak",
      value: formatRupiah(totalContractValue),
      icon: Wallet,
      accent: "text-ink bg-ink/5 border-ink/10",
    },
    {
      label: "Nilai Kontrak Berjalan",
      value: formatRupiah(runningContractValue),
      icon: TrendingUp,
      accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
    },
    {
      label: "Nilai Kontrak Selesai",
      value: formatRupiah(completedContractValue),
      icon: CheckCircle2,
      accent: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
    },
    {
      label: "Rata-rata Lama Pengerjaan",
      value: `${avgDays} hari`,
      icon: Gauge,
      accent: "text-accent bg-accent/5 border-accent/20",
    },
  ];

  return (
    <>
      <Navbar
        title="Project Monitoring"
        subtitle="Database & pengingat durasi project internal perusahaan"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${card.accent}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="text-lg font-semibold text-ink truncate">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
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
          }))}
        />
      </div>
    </>
  );
}
