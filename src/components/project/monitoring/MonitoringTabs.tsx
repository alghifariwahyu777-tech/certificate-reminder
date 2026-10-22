"use client";

import { ReactNode, useEffect, useState } from "react";
import { AlertOctagon, ClipboardList, FileText, Flag, LayoutDashboard, Receipt, Wallet } from "lucide-react";

const TABS = [
  { key: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
  { key: "progres", label: "Progres", icon: ClipboardList },
  { key: "milestone", label: "Milestone", icon: Flag },
  { key: "termin", label: "Termin & Penagihan", icon: Receipt },
  { key: "biaya", label: "Biaya", icon: Wallet },
  { key: "kendala", label: "Kendala & Risiko", icon: AlertOctagon },
  { key: "kontrak", label: "Kontrak & Addendum", icon: FileText },
] as const;

export type MonitoringTabKey = (typeof TABS)[number]["key"];

/**
 * Tab bar for the project detail page. The active tab lives in the URL hash
 * (#termin etc.) so a refresh after saving — or a link from an email/the
 * portfolio dashboard — lands on the same tab. Hash (not a search param) so
 * no Suspense boundary is needed around useSearchParams.
 */
export function MonitoringTabs({ panels, badges }: { panels: Record<MonitoringTabKey, ReactNode>; badges?: Partial<Record<MonitoringTabKey, number>> }) {
  const [tab, setTab] = useState<MonitoringTabKey>("ringkasan");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as MonitoringTabKey;
      if (TABS.some((t) => t.key === h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function select(key: MonitoringTabKey) {
    setTab(key);
    history.replaceState(null, "", `#${key}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-ink text-white dark:bg-slate-100 dark:text-ink" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {!!badges?.[t.key] && (
              <span className="ml-0.5 rounded-full bg-signal-expired text-white text-[10px] leading-none px-1.5 py-0.5">{badges[t.key]}</span>
            )}
          </button>
        ))}
      </div>
      <div>{panels[tab]}</div>
    </div>
  );
}
