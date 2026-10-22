import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

  return (
    <>
      <Navbar
        title="Dashboard Realisasi Project"
        subtitle="Pusat monitoring progres, penagihan, biaya & kendala seluruh project"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-5">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Daftar project
        </Link>
        <PortfolioDashboard rows={rows} categories={categories} />
      </div>
    </>
  );
}
