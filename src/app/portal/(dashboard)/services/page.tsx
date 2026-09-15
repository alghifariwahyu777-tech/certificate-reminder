import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Layers, ArrowRight, ShieldCheck, CalendarClock, Clock } from "lucide-react";

export default async function PortalServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-5 md:p-8 space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">Katalog Layanan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Layanan sertifikasi yang tersedia dari PT Sucofindo (Persero).
        </p>
      </div>

      {services.length === 0 ? (
        <Card>
          <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada layanan yang tersedia.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Link key={service.id} href={`/portal/services/${service.id}`}>
              <Card className="p-5 h-full hover:border-accent/40 transition-colors">
                <div className="h-9 w-9 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10 mb-3">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-semibold text-ink dark:text-slate-100">{service.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{service.code}</p>
                {service.description && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{service.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {service.requiresAudit && (
                    <span className="stamp-badge text-accent bg-accent/5 border-accent/20">
                      <ShieldCheck className="h-3 w-3" /> Audit
                    </span>
                  )}
                  {service.requiresSurveillance && (
                    <span className="stamp-badge text-signal-soon bg-signal-soonBg border-signal-soonBorder">
                      <CalendarClock className="h-3 w-3" /> Surveillance
                    </span>
                  )}
                  {service.estimatedProcessingDays && (
                    <span className="stamp-badge text-slate-500 bg-slate-100 border-slate-200">
                      <Clock className="h-3 w-3" /> ~{service.estimatedProcessingDays} hari
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-accent flex items-center gap-1 mt-3">
                  Lihat detail <ArrowRight className="h-3 w-3" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
