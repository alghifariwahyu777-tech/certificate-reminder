import { Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { WeeklyReportSettingsForm } from "@/components/settings/WeeklyReportSettingsForm";
import { buildWeeklyReport, renderWeeklyReportEmail } from "@/lib/weekly-report";
import { LOGO_DATA_URI } from "@/lib/brand-assets";
import { WEEKDAY_LABEL } from "@/lib/week";

/** This week's management report as recipients will get it, with its sending settings on the same page. */
export default async function WeeklyReportPreviewPage() {
  const session = await getSession();
  const [data, settings] = await Promise.all([buildWeeklyReport(), prisma.appSettings.findUnique({ where: { id: "default" } })]);
  const html = renderWeeklyReportEmail(data, { logoSrc: LOGO_DATA_URI });
  const recipients = (settings?.weeklyReportRecipients || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const enabled = !!settings?.weeklyReportEnabled;
  const day = WEEKDAY_LABEL[settings?.weeklyReportDay ?? 1];

  return (
    <>
      <Navbar title="Laporan Mingguan" subtitle="Ringkasan kondisi seluruh project untuk manajemen" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="space-y-4 p-5 md:p-8">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
            {enabled ? (
              <>
                Laporan dikirim otomatis setiap <strong className="text-ink dark:text-slate-100">{day}</strong> sekitar pukul 08.00 WIB kepada{" "}
                <strong className="text-ink dark:text-slate-100">{recipients.length} penerima</strong>, berupa email ringkas dengan lampiran PDF. Tampilan di bawah adalah isi email minggu ini.
              </>
            ) : (
              <>
                Pengiriman otomatis <strong className="text-signal-soon">belum aktif</strong>. Tampilan di bawah adalah isi email minggu ini; aktifkan pengiriman pada bagian pengaturan di bawah.
              </>
            )}
          </p>
          <a href="/api/weekly-report/pdf" className="shrink-0">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4" />
              Unduh PDF
            </Button>
          </a>
        </div>

        <iframe title="Pratinjau laporan mingguan" srcDoc={html} className="h-[78vh] w-full rounded-lg border border-line bg-white dark:border-slate-700" />

        {session?.role === "ADMIN" && (
          <details id="pengaturan" className="rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-900" open={!enabled}>
            <summary className="cursor-pointer select-none px-5 py-3.5 text-[13.5px] font-semibold text-ink dark:text-slate-100">Pengaturan pengiriman: penerima, jadwal, dan kirim uji</summary>
            <div className="border-t border-line p-4 dark:border-slate-800">
              <WeeklyReportSettingsForm
                canManage
                embedded
                initial={{
                  weeklyReportEnabled: enabled,
                  weeklyReportRecipients: recipients.join("\n"),
                  weeklyReportDay: settings?.weeklyReportDay ?? 1,
                  picUpdateRequestEnabled: settings?.picUpdateRequestEnabled ?? true,
                  picUpdateRequestDay: settings?.picUpdateRequestDay ?? 1,
                }}
              />
            </div>
          </details>
        )}
      </div>
    </>
  );
}
