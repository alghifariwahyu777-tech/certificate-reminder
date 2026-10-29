import Link from "next/link";
import { PageBody } from "@/components/layout/PageBody";
import { Notice } from "@/components/ui/Notice";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DemoDataButton } from "@/components/project/monitoring/DemoDataButton";
import { DemoSeeder } from "@/components/project/monitoring/DemoSeeder";
import { DEMO_PREFIX, ensureDemoDataOnce } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { getProjectPortfolio } from "@/lib/project-monitoring";
import { getPersonnelMapping } from "@/lib/personnel-mapping";
import { getPortfolioCalendar } from "@/lib/portfolio-insights";
import { getJakartaToday } from "@/lib/status";
import { PortfolioDashboard } from "@/components/project/monitoring/PortfolioDashboard";

export default async function ProjectPortfolioPage() {
  const session = await getSession();
  const demo = await ensureDemoDataOnce();
  const [{ rows, curve, curves, healthTrend, aging, risks, cashflow, paretoCost, paretoIssues, perfTrend, today: todayMs }, categories, people, calendar] = await Promise.all([
    getProjectPortfolio(),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getPersonnelMapping(false),
    getPortfolioCalendar(getJakartaToday().getTime()),
  ]);

  const hasDemo = rows.some((r) => r.projectNumber.startsWith(DEMO_PREFIX));
  const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Navbar title="Monitoring Project" subtitle={`Kondisi per ${today}`} adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        {session?.role === "ADMIN" && demo.state === "error" && (
          <Notice tone="danger" title="Data contoh gagal dibuat" action={<DemoDataButton hasDemo={false} />}>
            {demo.message}
          </Notice>
        )}
        {demo.state === "pending" && <DemoSeeder present={demo.present ?? 0} total={demo.total ?? 0} />}
        {hasDemo && (
          <Notice tone="warning" title="Data contoh sedang ditampilkan" action={session?.role === "ADMIN" ? <DemoDataButton hasDemo /> : undefined}>
            Project bernomor DEMO hanya untuk uji coba. Hapus data contoh sebelum memasukkan data asli.
          </Notice>
        )}
        <PortfolioDashboard rows={rows} categories={categories} curve={curve} curves={curves} healthTrend={healthTrend} aging={aging} risks={risks} people={people} extra={{ cashflow, paretoCost, paretoIssues, perfTrend, calendar }} today={todayMs}
          actions={
            <>
              {session?.role === "ADMIN" && (
                <Link href="/projects/new">
                  <Button className="w-full">
                    <Plus className="h-4 w-4" />
                    Tambah project
                  </Button>
                </Link>
              )}
            </>
          }
        />
      </PageBody>
    </>
  );
}
