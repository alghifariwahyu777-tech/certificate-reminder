import Link from "next/link";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/lib/application";
import { Plus, ClipboardList, ArrowRight } from "lucide-react";

export default async function PortalApplicationsPage() {
  const session = await getClientSession();
  if (!session) return null;

  const applications = await prisma.application.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true, code: true } } },
  });

  return (
    <div className="p-5 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">
            Pengajuan Sertifikasi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Riwayat & status permohonan sertifikasi Anda.</p>
        </div>
        <Link href="/portal/applications/new">
          <Button>
            <Plus className="h-4 w-4" />
            Ajukan Baru
          </Button>
        </Link>
      </div>

      {applications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
            <ClipboardList className="h-8 w-8" />
            <p className="text-sm">Anda belum memiliki pengajuan sertifikasi.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/portal/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <div>
                  <p className="text-sm font-medium text-ink dark:text-slate-100">{app.service.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {app.applicationNumber} · Dibuat {formatDate(app.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`stamp-badge ${APPLICATION_STATUS_COLORS[app.status]}`}>
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
