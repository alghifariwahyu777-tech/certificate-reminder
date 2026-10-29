import Link from "next/link";
import { ChevronRight, FolderOpen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPicProjects } from "@/lib/pic-update";
import { HEALTH_BADGE_CLASS, HEALTH_LABEL, formatPercent, shortDate } from "@/lib/project-monitoring-shared";
import { ProgressBar } from "@/components/project/monitoring/shared";

export default async function PicHomePage() {
  const session = await getSession();
  const projects = session ? await getPicProjects(session.email) : [];
  const ongoing = projects.filter((p) => p.project.status === "ONGOING");
  const others = projects.filter((p) => p.project.status !== "ONGOING");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">Project Anda</h1>
        <p className="text-sm text-slate-500 mt-1">Pilih project untuk mengirim pembaruan progres. Cukup ±2 menit per project.</p>
      </div>

      {ongoing.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-5 py-10 text-center text-slate-500">
          <p className="mt-2 text-sm">
            Belum ada project berjalan dengan email PIC <span className="font-medium">{session?.email}</span>. Hubungi admin bila ini keliru.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ongoing.map(({ project, summary }) => {
          const stale = summary.isStale;
          return (
            <Link
              key={project.id}
              href={`/pic/${project.id}`}
              className="block rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink dark:text-slate-100">{project.projectName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{project.projectNumber}</span>, target {shortDate(project.targetEndDate.getTime())}
                  </p>
                </div>
                <span className={`stamp-badge shrink-0 ${HEALTH_BADGE_CLASS[summary.health]}`}>{HEALTH_LABEL[summary.health]}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-3 mb-1.5">
                <span>Progres {formatPercent(summary.actualPercent)}</span>
                <span>Rencana {formatPercent(summary.plannedPercent)}</span>
              </div>
              <ProgressBar value={summary.actualPercent} marker={summary.plannedPercent} />
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs ${stale ? "text-signal-soon font-medium" : "text-slate-400"}`}>
                  {summary.lastProgressUpdate ? `Diperbarui terakhir ${shortDate(summary.lastProgressUpdate)}` : "Belum ada pembaruan"}
                  {stale ? ", mohon diperbarui" : ""}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Update <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {others.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Project selesai/dibatalkan ({others.length})</summary>
          <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
            {others.map(({ project, summary }) => (
              <li key={project.id}>
                {project.projectName}, {HEALTH_LABEL[summary.health]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
