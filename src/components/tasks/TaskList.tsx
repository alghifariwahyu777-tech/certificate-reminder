"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Card";
import { TabNav } from "@/components/ui/TabNav";
import { OWNER_LABEL, OWNER_ORDER, type TaskOwner } from "@/lib/project-tasks";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

type Key = TaskOwner | "semua";

/** Tasks per department, with the user's own department opened first. */
export function TaskList({ tasks, mine }: { tasks: Task[]; mine: TaskOwner | null }) {
  const [tab, setTab] = useState<Key>(mine ?? "semua");
  useEffect(() => {
    const h = window.location.hash.slice(1) as Key;
    if (h === "semua" || OWNER_ORDER.includes(h as TaskOwner)) setTab(h);
  }, []);
  const tabs = useMemo(
    () => [
      ...OWNER_ORDER.map((o) => ({ key: o as Key, label: o === mine ? `${OWNER_LABEL[o]} (saya)` : OWNER_LABEL[o], badge: tasks.filter((t) => t.owner === o && t.tone === "bad").length })),
      { key: "semua" as Key, label: "Semua bagian", badge: 0 },
    ],
    [tasks, mine]
  );
  const shown = tab === "semua" ? tasks : tasks.filter((t) => t.owner === tab);
  const counts = (o: Key) => (o === "semua" ? tasks : tasks.filter((t) => t.owner === o)).length;

  return (
    <div className="space-y-4">
      <TabNav
        label="Bagian"
        tabs={tabs}
        value={tab}
        onChange={(k) => {
          setTab(k);
          history.replaceState(null, "", `#${k}`);
        }}
      />
      <Card>
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <p className="text-[13px] text-slate-500">
            {counts(tab)} tugas, {shown.filter((t) => t.tone === "bad").length} mendesak
          </p>
        </div>
        {shown.length === 0 ? (
          <EmptyState>Tidak ada tugas untuk bagian ini. Semua sudah ditindaklanjuti.</EmptyState>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {shown.map((t) => (
              <li key={t.key}>
                <Link href={t.href} className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", t.tone === "bad" ? "bg-signal-expiredBar" : "bg-signal-soonBar")} aria-label={t.tone === "bad" ? "Mendesak" : "Perlu disiapkan"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink dark:text-slate-100">{t.subject}</span>
                    <span className="block text-[13px] text-slate-600 dark:text-slate-300">{t.title}</span>
                  </span>
                  {tab === "semua" && <span className="mt-0.5 shrink-0 rounded border border-line px-1.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700">{OWNER_LABEL[t.owner]}</span>}
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-accent" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
