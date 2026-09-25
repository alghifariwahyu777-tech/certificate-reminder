import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
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

type ReportCardDef = { type: ReportType; description: string; icon: typeof ShieldCheck };

// Grouped by category so it's immediately clear which data comes from
// where — previously all 13 report types were dumped into one flat grid.
const REPORT_SECTIONS: { title: string; subtitle: string; reports: ReportCardDef[] }[] = [
  {
    title: "Certificate Klien",
    subtitle: "Sertifikat, renewal, permohonan, dan surveillance untuk klien",
    reports: [
      { type: "active", description: "Seluruh sertifikat yang masih berlaku (sisa lebih dari 30 hari).", icon: ShieldCheck },
      { type: "expiring_soon", description: "Sertifikat yang akan berakhir dalam 30 hari ke depan.", icon: TimerReset },
      { type: "expired", description: "Sertifikat yang telah melewati tanggal berakhir.", icon: AlertTriangle },
      { type: "renewal_history", description: "Seluruh riwayat perpanjangan sertifikat yang tercatat.", icon: RefreshCw },
      { type: "recap_department", description: "Rekap jumlah sertifikat per divisi beserta status masing-masing.", icon: Building },
      { type: "recap_category", description: "Rekap jumlah sertifikat per kategori beserta status masing-masing.", icon: FolderKanban },
      { type: "application_status", description: "Seluruh permohonan sertifikasi beserta status dan lama proses hingga terbit.", icon: ClipboardList },
      { type: "surveillance", description: "Jadwal surveillance seluruh sertifikat beserta status kunjungannya.", icon: CalendarClock },
      { type: "sla", description: "Kepatuhan SLA tiap tahap workflow — aktual vs target hari yang dikonfigurasi.", icon: Gauge },
      { type: "monitoring", description: "Ringkasan proses & nilai kontrak seluruh permohonan untuk manajemen.", icon: Wallet },
    ],
  },
  {
    title: "Personnel",
    subtitle: "Sertifikasi/kompetensi personil internal",
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
    subtitle: "Status & nilai kontrak project internal",
    reports: [
      {
        type: "project_status",
        description: "Seluruh project beserta kategori, klien, PIC, nilai kontrak, target selesai, dan status.",
        icon: FolderClock,
      },
    ],
  },
  {
    title: "Equipment",
    subtitle: "Jadwal kalibrasi alat internal",
    reports: [
      {
        type: "equipment_calibration",
        description: "Seluruh alat beserta merk/tipe, PIC, tanggal kalibrasi terakhir & berikutnya, dan status.",
        icon: Wrench,
      },
    ],
  },
];

function ReportCard({ report }: { report: ReportCardDef }) {
  const Icon = report.icon;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="h-9 w-9 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{REPORT_LABELS[report.type]}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.description}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <a
            href={`/api/reports/export?type=${report.type}&format=xlsx`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </a>
          <a
            href={`/api/reports/export?type=${report.type}&format=pdf`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
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
        title="Reports"
        subtitle="Ekspor laporan ke Excel atau PDF, dikelompokkan per kategori"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-8">
        {REPORT_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <div>
              <h2 className="font-display font-semibold text-ink text-base">{section.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.reports.map((report) => (
                <ReportCard key={report.type} report={report} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
