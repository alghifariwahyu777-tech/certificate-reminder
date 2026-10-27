import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { PortfolioDashboard } from "@/components/project/monitoring/PortfolioDashboard";

export default async function ProjectPortfolioPage() {
  const session = await getSession();
  const [{ rows }, categories] = await Promise.all([
    getProjectPortfolio(),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const ongoing = rows.filter((r) => r.status === "ONGOING").length;
  const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Navbar title="Monitoring Project" subtitle={`Kondisi ${ongoing} project berjalan per ${today}`} adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="space-y-5 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/projects/weekly-report">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" />
              Laporan mingguan
            </Button>
          </Link>
          {session?.role === "ADMIN" && (
            <Link href="/projects/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Project baru
              </Button>
            </Link>
          )}
        </div>
        <PortfolioDashboard rows={rows} categories={categories} />
      </div>
    </>
  );
}
