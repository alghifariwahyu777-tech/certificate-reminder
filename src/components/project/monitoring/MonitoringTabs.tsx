"use client";

import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SubTabs } from "./shared";

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "jadwal", label: "Jadwal & Progres" },
  { key: "keuangan", label: "Keuangan" },
  { key: "tim", label: "Tim & Kendala" },
  { key: "dokumen", label: "Dokumen" },
] as const;

export type MonitoringTabKey = (typeof TABS)[number]["key"];
export type MonitoringSection = { key: string; label: string; badge?: number; node: ReactNode };
type Panel = ReactNode | MonitoringSection[];

const isSections = (p: Panel): p is MonitoringSection[] => Array.isArray(p) && p.length > 0 && typeof p[0] === "object" && p[0] !== null && "node" in (p[0] as object);

/**
 * Five tabs; a tab with several parts shows them one at a time through a small
 * segmented control. The location lives in the URL hash ("#keuangan/termin"),
 * so a refresh or a link from an email lands on the same place. Old single-word
 * hashes from earlier versions (#termin, #biaya, #margin, …) still resolve.
 */
export function MonitoringTabs({ panels }: { panels: Record<MonitoringTabKey, Panel> }) {
  const [tab, setTab] = useState<MonitoringTabKey>("ringkasan");
  const [section, setSection] = useState<Partial<Record<MonitoringTabKey, string>>>({});

  useEffect(() => {
    const read = () => {
      const [a, b] = window.location.hash.slice(1).split("/");
      if (!a) return;
      if (TABS.some((t) => t.key === a)) {
        setTab(a as MonitoringTabKey);
        if (b) setSection((s) => ({ ...s, [a]: b }));
        return;
      }
      // legacy / direct section links: find the tab that owns the section
      for (const t of TABS) {
        const p = panels[t.key];
        if (isSections(p) && p.some((x) => x.key === a)) {
          setTab(t.key);
          setSection((s) => ({ ...s, [t.key]: a }));
          return;
        }
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // panels' section keys are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(key: MonitoringTabKey, sub?: string) {
    setTab(key);
    if (sub) setSection((s) => ({ ...s, [key]: sub }));
    history.replaceState(null, "", `#${key}${sub ? `/${sub}` : ""}`);
  }

  const badgeOf = (p: Panel) => (isSections(p) ? p.reduce((a, x) => a + (x.badge || 0), 0) : 0);
  const current = panels[tab];

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-1 overflow-x-auto overflow-y-hidden border-b border-line dark:border-slate-800">
        <div className="flex gap-1 px-1">
          {TABS.map((t) => {
            const badge = badgeOf(panels[t.key]);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => go(t.key)}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors",
                  tab === t.key
                    ? "border-brand-blueDark text-brand-blueDark dark:border-slate-100 dark:text-slate-100"
                    : "border-transparent text-slate-500 hover:text-ink dark:hover:text-slate-200"
                )}
              >
                {t.label}
                {badge > 0 && <span className="ml-1.5 rounded-full bg-signal-expired px-1.5 py-0.5 text-[10px] leading-none text-white">{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {isSections(current) ? (
        <SectionedPanel sections={current} value={section[tab] && current.some((x) => x.key === section[tab]) ? (section[tab] as string) : current[0].key} onChange={(k) => go(tab, k)} />
      ) : (
        <div>{current}</div>
      )}
    </div>
  );
}

function SectionedPanel({ sections, value, onChange }: { sections: MonitoringSection[]; value: string; onChange: (k: string) => void }) {
  const active = sections.find((s) => s.key === value) ?? sections[0];
  return (
    <div className="space-y-4">
      {sections.length > 1 && <SubTabs items={sections.map((s) => ({ key: s.key, label: s.label, badge: s.badge }))} value={active.key} onChange={onChange} />}
      <div>{active.node}</div>
    </div>
  );
}
