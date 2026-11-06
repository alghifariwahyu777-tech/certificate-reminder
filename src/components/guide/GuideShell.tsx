"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  BookA,
  CalendarCheck,
  CalendarClock,
  ChartGantt,
  Grid3x3,
  HardHat,
  Info,
  Layers,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Rocket,
  Search,
  ShieldCheck,
  Timer,
  TrendingUp,
  Wallet,
  Banknote,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "mulai-cepat": Rocket,
  tentang: Info,
  peran: ShieldCheck,
  tugas: ListChecks,
  "alur-project": Workflow,
  paket: Layers,
  rutinitas: CalendarClock,
  progres: TrendingUp,
  kondisi: Activity,
  "kinerja-waktu": Timer,
  "kinerja-biaya": Wallet,
  "proyeksi-selesai": CalendarCheck,
  "proyeksi-margin": PiggyBank,
  keuangan: Banknote,
  pareto: BarChart3,
  "peta-risiko": Grid3x3,
  hse: HardHat,
  gantt: ChartGantt,
  portofolio: LayoutDashboard,
  pengingat: BellRing,
  istilah: BookA,
};

export type GuideSection = { id: string; title: string; tags: string; content: React.ReactNode; interactive?: boolean };
export type GuideGroup = { title: string; sections: GuideSection[] };

const POPULAR: [string, string][] = [
  ["mulai-cepat", "Mulai cepat"],
  ["progres", "Kurva S"],
  ["proyeksi-margin", "Margin"],
  ["kinerja-waktu", "Kinerja waktu"],
  ["peta-risiko", "Peta risiko"],
  ["pareto", "Pareto"],
];

export function GuideShell({ groups }: { groups: GuideGroup[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(groups[0]?.sections[0]?.id ?? "");

  const query = q.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return groups;
    const words = query.split(/\s+/);
    return groups
      .map((g) => ({ ...g, sections: g.sections.filter((s) => words.every((w) => `${s.title} ${s.tags}`.toLowerCase().includes(w))) }))
      .filter((g) => g.sections.length);
  }, [groups, query]);
  const count = visible.reduce((n, g) => n + g.sections.length, 0);

  // highlight the section being read in the table of contents
  useEffect(() => {
    const els = visible.flatMap((g) => g.sections.map((s) => document.getElementById(s.id))).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  const go = (id: string) => {
    setQ("");
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-line bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-[#123F6B] to-[#1671B8] px-5 py-5 text-white md:px-6">
          <h2 className="text-[19px] font-bold">Apa yang ingin Anda ketahui?</h2>
          <p className="mt-0.5 text-[13px] text-white/80">Cari topik, atau mulai dari langkah pertama untuk peran Anda.</p>
          <div className="relative mt-3 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari, misalnya margin, Gantt, LTIFR, termin"
              aria-label="Cari topik panduan"
              className="h-11 w-full rounded-lg border-0 bg-white pl-9 pr-9 text-[14px] text-ink shadow-sm outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-white/60 dark:bg-slate-900 dark:text-slate-100"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-5 py-3 md:px-6">
          <span className="mr-1 text-[12px] text-slate-500">Sering dibuka:</span>
          {POPULAR.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold text-brand-blueDark hover:border-brand-blueDark hover:bg-[#EEF5FB] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Isi panduan" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="max-h-[calc(100vh-7.5rem)] space-y-3 overflow-y-auto rounded-xl border border-line bg-white p-3 text-[13px] dark:border-slate-700 dark:bg-slate-900">
            {visible.map((g) => (
              <div key={g.title}>
                <p className="mb-1 px-2 text-[11.5px] font-semibold text-slate-500">{g.title}</p>
                <ul className="space-y-0.5">
                  {g.sections.map((s) => {
                    const Icon = ICONS[s.id] ?? Info;
                    const on = active === s.id;
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          aria-current={on ? "location" : undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 leading-snug transition-colors",
                            on ? "bg-[#EEF5FB] font-semibold text-brand-blueDark dark:bg-slate-800 dark:text-slate-100" : "text-slate-700 hover:bg-paper dark:text-slate-300 dark:hover:bg-slate-800"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", on ? "text-brand-blueDark dark:text-slate-100" : "text-slate-400")} aria-hidden />
                          <span className="min-w-0 flex-1">{s.title}</span>
                          {s.interactive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" title="Ada contoh interaktif" />}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="flex items-center gap-1.5 border-t border-line px-2 pt-2 text-[11px] text-slate-500 dark:border-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Ada contoh interaktif
            </p>
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          {query && (
            <p className="text-[13px] text-slate-500" aria-live="polite">
              {count ? `${count} topik cocok dengan "${q.trim()}"` : `Tidak ada topik yang cocok dengan "${q.trim()}". Coba kata lain, misalnya progres, biaya, atau risiko.`}
            </p>
          )}
          {visible.map((g) => (
            <div key={g.title} className="space-y-4">
              <h2 className="px-1 text-[12.5px] font-semibold text-slate-500">{g.title}</h2>
              {g.sections.map((s) => {
                const Icon = ICONS[s.id] ?? Info;
                return (
                  <section key={s.id} id={s.id} className="scroll-mt-24 rounded-xl border border-line bg-white p-5 dark:border-slate-700 dark:bg-slate-900 md:p-6">
                    <header className="mb-3 flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C9DDF0] bg-[#EEF5FB] text-brand-blueDark dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-hidden>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <h3 className="text-[17px] font-bold text-ink dark:text-slate-100">{s.title}</h3>
                    </header>
                    <div className="max-w-[880px] text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{s.content}</div>
                  </section>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
