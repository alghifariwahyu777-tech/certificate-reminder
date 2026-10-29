import Link from "next/link";
import { getClientSession } from "@/lib/client-auth";
import { ENTITY_ICON } from "@/lib/entity-icons";
import { prisma } from "@/lib/prisma";
import { getCertificateStatus, getDaysRemaining } from "@/lib/status";
import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { StatCard, StatGrid } from "@/components/ui/Stat";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, Layers } from "lucide-react";

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

  return (
    <div className="space-y-6 p-5 md:p-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">
          Selamat datang, {session.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Ringkasan status sertifikat perusahaan Anda.</p>
      </div>

      <StatGrid>
        <StatCard icon={ENTITY_ICON.certificate} label="Total sertifikat" value={certificates.length} sub="Seluruh sertifikat perusahaan Anda" />
        <StatCard icon={CheckCircle2} label="Masih berlaku" value={active} tone={active ? "good" : "default"} sub="Lebih dari 30 hari lagi" />
        <StatCard icon={Clock} label="Berakhir dalam 30 hari" value={expiringSoon} tone={expiringSoon ? "warn" : "default"} sub="Segera ajukan perpanjangan" />
        <StatCard icon={AlertTriangle} label="Sudah berakhir" value={expired} tone={expired ? "bad" : "default"} sub="Perlu ditindaklanjuti" />
      </StatGrid>

      <Card>
        <CardHead
          title="Perlu ditindaklanjuti"
          description="Sertifikat yang sudah atau akan berakhir dalam 30 hari"
          action={
            <Link href="/portal/certificates" className="text-[13px] font-semibold text-accent hover:text-accent-light">
              Lihat semua
            </Link>
          }
        />
        {attention.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Semua sertifikat Anda dalam kondisi baik, tidak ada yang perlu segera ditindaklanjuti.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {attention.map((c) => {
              const days = getDaysRemaining(c.expiryDate);
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-slate-100">{c.certificateName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.certificateNumber}, {c.category.name}, {formatDate(c.expiryDate)}
                      {", "}
                      {days < 0 ? `lewat ${Math.abs(days)} hari` : `${days} hari lagi`}
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
          <CardHead title="Pengajuan sertifikasi" />
          <CardContent className="pt-2">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
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
          <CardHead title="Jadwal surveilans" />
          <CardContent className="pt-2">
            <div className="min-w-0 flex-1">
              {upcomingSurveillances.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada jadwal surveilans saat ini.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingSurveillances.map((s) => (
                    <li key={s.id} className="text-sm text-slate-500">
                      <span className="text-ink dark:text-slate-200 font-medium">
                        {s.certificate.certificateName}
                      </span>
                      , surveilans ke-{s.sequenceNumber}, {formatDate(s.scheduledDate)}
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
