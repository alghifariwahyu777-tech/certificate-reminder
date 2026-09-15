import Link from "next/link";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { getCertificateStatus, getDaysRemaining } from "@/lib/status";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, TimerReset, AlertTriangle, FileBadge2, ArrowRight, ClipboardList, CalendarClock } from "lucide-react";

export default async function PortalDashboardPage() {
  const session = await getClientSession();
  if (!session) return null;

  const certificates = await prisma.certificate.findMany({
    where: { clientId: session.clientId, deletedAt: null },
    include: { category: true },
    orderBy: { expiryDate: "asc" },
  });

  const upcomingSurveillances = await prisma.surveillance.findMany({
    where: {
      certificate: { clientId: session.clientId, deletedAt: null },
      status: { in: ["SCHEDULED", "CONFIRMED", "POSTPONED"] },
    },
    include: { certificate: { select: { certificateName: true, certificateNumber: true } } },
    orderBy: { scheduledDate: "asc" },
    take: 5,
  });

  const active = certificates.filter((c) => getCertificateStatus(c.expiryDate) === "ACTIVE").length;
  const expiringSoon = certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRING_SOON").length;
  const expired = certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRED").length;

  const attention = certificates
    .filter((c) => {
      const s = getCertificateStatus(c.expiryDate);
      return s === "EXPIRING_SOON" || s === "EXPIRED";
    })
    .slice(0, 5);

  const stats = [
    { label: "Total Sertifikat", value: certificates.length, icon: FileBadge2, accent: "text-ink bg-ink/5 border-ink/10" },
    { label: "Aktif", value: active, icon: ShieldCheck, accent: "text-signal-active bg-signal-activeBg border-signal-activeBorder" },
    { label: "Akan Berakhir", value: expiringSoon, icon: TimerReset, accent: "text-signal-soon bg-signal-soonBg border-signal-soonBorder" },
    { label: "Kedaluwarsa", value: expired, icon: AlertTriangle, accent: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder" },
  ];

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">
          Selamat datang, {session.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Ringkasan status sertifikat perusahaan Anda.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-1.5">{s.label}</p>
                <p className="font-display text-2xl font-semibold text-ink dark:text-slate-100 font-mono">{s.value}</p>
              </div>
              <div className={`h-9 w-9 rounded flex items-center justify-center border ${s.accent}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display font-semibold text-ink dark:text-slate-100 text-base">Perlu Perhatian</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sertifikat yang akan/telah berakhir</p>
          </div>
          <Link href="/portal/certificates" className="text-xs font-medium text-accent hover:text-accent-light flex items-center gap-1">
            Lihat semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {attention.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Semua sertifikat Anda dalam kondisi baik — tidak ada yang perlu segera ditindaklanjuti.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {attention.map((c) => {
              const days = getDaysRemaining(c.expiryDate);
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-slate-100">{c.certificateName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {c.certificateNumber} · {c.category.name} · {formatDate(c.expiryDate)}
                      {" · "}
                      {days < 0 ? `terlambat ${Math.abs(days)} hari` : `${days} hari lagi`}
                    </p>
                  </div>
                  <StatusBadge expiryDate={c.expiryDate} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="h-9 w-9 rounded flex items-center justify-center border text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink dark:text-slate-100">Pengajuan Sertifikasi</p>
              <p className="text-xs text-slate-500 mt-1">
                Lihat{" "}
                <Link href="/portal/services" className="text-accent hover:text-accent-light underline">
                  Katalog Layanan
                </Link>{" "}
                untuk cek persyaratan dokumen, lalu{" "}
                <Link href="/portal/applications/new" className="text-accent hover:text-accent-light underline">
                  ajukan sertifikasi baru
                </Link>{" "}
                langsung dari portal ini.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="h-9 w-9 rounded flex items-center justify-center border text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
              <CalendarClock className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink dark:text-slate-100">Jadwal Surveillance</p>
              {upcomingSurveillances.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">Tidak ada jadwal surveillance saat ini.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {upcomingSurveillances.map((s) => (
                    <li key={s.id} className="text-xs text-slate-500">
                      <span className="text-ink dark:text-slate-200 font-medium">
                        {s.certificate.certificateName}
                      </span>{" "}
                      — Surveillance ke-{s.sequenceNumber}, {formatDate(s.scheduledDate)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
