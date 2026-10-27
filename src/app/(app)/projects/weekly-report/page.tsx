import Link from "next/link";
import { ArrowLeft, Download, Settings } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { buildWeeklyReport, renderWeeklyReportEmail } from "@/lib/weekly-report";
import { LOGO_DATA_URI } from "@/lib/brand-assets";

/** Live preview of this week's management report — exactly the email body recipients get. */
export default async function WeeklyReportPreviewPage() {
  const session = await getSession();
  const data = await buildWeeklyReport();
  const html = renderWeeklyReportEmail(data, { logoSrc: LOGO_DATA_URI });

  return (
    <>
      <Navbar
        title="Laporan Mingguan"
        subtitle={`Pratinjau ${data.weekKey} — isi email yang diterima manajemen (detail lengkap di lampiran PDF)`}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/projects/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Monitoring Project
          </Link>
          <div className="flex gap-2">
            <a href="/api/weekly-report/pdf">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" />
                Unduh PDF
              </Button>
            </a>
            {session?.role === "ADMIN" && (
              <Link href="/settings">
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                  Penerima & jadwal
                </Button>
              </Link>
            )}
          </div>
        </div>
        <iframe title="Pratinjau laporan mingguan" srcDoc={html} className="w-full h-[78vh] rounded border border-slate-200 dark:border-slate-700 bg-white" />
      </div>
    </>
  );
}
