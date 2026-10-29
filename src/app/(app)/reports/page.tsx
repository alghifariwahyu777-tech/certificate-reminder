import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import type { LucideIcon } from "lucide-react";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { IconBox } from "@/components/ui/IconBox";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { REPORT_LABELS, type ReportType } from "@/lib/reports";
import {
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  TimerReset,
  RefreshCw,
  Building,
  FolderKanban,
  ClipboardList,
  CalendarClock,
  Gauge,
  Wallet,
  UserSquare2,
  FolderClock,
  Wrench,
} from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";

type ReportCardDef = { type: ReportType; description: string; icon: typeof ShieldCheck };

// Grouped by category so it's immediately clear which data comes from
// where — previously all 13 report types were dumped into one flat grid.
const REPORT_SECTIONS: { title: string; subtitle: string; icon: LucideIcon; reports: ReportCardDef[] }[] = [
  {
    title: "Sertifikat klien",
    icon: ENTITY_ICON.certificate,
    subtitle: "Sertifikat, perpanjangan, permohonan, dan surveilans untuk klien",
    reports: [
      { type: "active", description: "Seluruh sertifikat yang masih berlaku (sisa lebih dari 30 hari).", icon: ShieldCheck },
      { type: "expiring_soon", description: "Sertifikat yang akan berakhir dalam 30 hari ke depan.", icon: TimerReset },
      { type: "expired", description: "Sertifikat yang telah melewati tanggal berakhir.", icon: AlertTriangle },
      { type: "renewal_history", description: "Seluruh riwayat perpanjangan sertifikat yang tercatat.", icon: RefreshCw },
      { type: "recap_department", description: "Rekap jumlah sertifikat per divisi beserta status masing-masing.", icon: Building },
      { type: "recap_category", description: "Rekap jumlah sertifikat per kategori beserta status masing-masing.", icon: FolderKanban },
      { type: "application_status", description: "Seluruh permohonan sertifikasi beserta status dan lama proses hingga terbit.", icon: ClipboardList },
      { type: "surveillance", description: "Jadwal surveilans seluruh sertifikat beserta status kunjungannya.", icon: CalendarClock },
      { type: "sla", description: "Kepatuhan SLA tiap tahap workflow, aktual vs target hari yang dikonfigurasi.", icon: Gauge },
      { type: "monitoring", description: "Ringkasan proses dan nilai kontrak seluruh permohonan untuk manajemen.", icon: Wallet },
    ],
  },
  {
    title: "Sertifikasi personil",
    icon: ENTITY_ICON.personnelCert,
    subtitle: "Sertifikasi dan kompetensi milik personil",
    reports: [
      {
        type: "personnel_certifications",
        description: "Daftar sertifikasi/kompetensi personil internal beserta status masa berlakunya.",
        icon: UserSquare2,
      },
    ],
  },
  {
    title: "Project",
    icon: ENTITY_ICON.project,
    subtitle: "Status dan nilai kontrak project",
    reports: [
      {
        type: "project_status",
        description: "Seluruh project beserta kategori, klien, PIC, nilai kontrak, target selesai, dan status.",
        icon: FolderClock,
      },
    ],
  },
  {
    title: "Kalibrasi alat",
    icon: ENTITY_ICON.equipment,
    subtitle: "Jadwal kalibrasi alat",
    reports: [
      {
        type: "equipment_calibration",
        description: "Seluruh alat beserta merk/tipe, PIC, tanggal kalibrasi terakhir dan berikutnya, dan status.",
        icon: Wrench,
      },
    ],
  },
];

function ReportCard({ report }: { report: ReportCardDef }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{REPORT_LABELS[report.type]}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.description}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <a href={`/api/reports/export?type=${report.type}&format=xlsx`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </a>
          <a href={`/api/reports/export?type=${report.type}&format=pdf`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage() {
  const session = await getSession();

  return (
    <>
      <Navbar
        title="Laporan"
        subtitle="Unduh laporan dalam format Excel atau PDF"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        {REPORT_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center gap-3">
              <IconBox icon={section.icon} />
              <div>
                <h2 className="text-base font-bold text-ink dark:text-slate-100">{section.title}</h2>
                <p className="text-[12.5px] text-slate-500">{section.subtitle}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.reports.map((report) => (
                <ReportCard key={report.type} report={report} />
              ))}
            </div>
          </div>
        ))}
      </PageBody>
    </>
  );
}
