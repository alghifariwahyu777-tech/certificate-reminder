import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUpdateFormContext, picOwnsProject } from "@/lib/pic-update";
import { ProgressUpdateForm } from "@/components/pic/ProgressUpdateForm";
import { formatPercent } from "@/lib/project-monitoring-shared";
import { fmtDate } from "@/components/project/monitoring/shared";

export default async function PicProjectUpdatePage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSession();
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { picEmail: true } });
  if (!session || !project) notFound();
  if (session.role !== "ADMIN" && !picOwnsProject(session.email, project)) notFound();

  const ctx = await getUpdateFormContext(id);
  if (!ctx) notFound();
  const recent = await prisma.projectProgressReport.findMany({ where: { projectId: id }, orderBy: { reportDate: "desc" }, take: 5 });

  return (
    <div className="space-y-5">
      <Link href="/pic" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Project Anda
      </Link>
      {ctx.status !== "ONGOING" ? (
        <p className="text-sm text-slate-500">Project ini sudah tidak berjalan — update progres ditutup.</p>
      ) : (
        <ProgressUpdateForm ctx={ctx} submitUrl={`/api/pic/projects/${id}/update`} uploadUrl="/api/pic/upload" />
      )}
      {recent.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Update sebelumnya</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {recent.map((r) => (
              <li key={r.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium tabular-nums">{formatPercent(Number(r.actualPercent))}</span>
                <span className="text-slate-400"> · {fmtDate(r.reportDate.toISOString())}</span>
                {r.summary && <p className="text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{r.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
