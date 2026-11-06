"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHead } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { actualAt, actualEvents, activityActualAt, activityPlanAt, activityStatusOn, formatPercent, interpolate, plannedPoints, windowDays } from "@/lib/project-monitoring-shared";
import { cn } from "@/lib/utils";
import { ActivityProgressModal, dayMs, isoDay } from "./ActivityProgress";
import { fmtDate, todayInput } from "./shared";
import { PackageTag } from "./Packages";
import type { ProjectMonitoringDTO } from "./types";

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
type Scale = "DAY" | "WEEK" | "MONTH";
const PX: Record<Scale, number> = { DAY: 30, WEEK: 9, MONTH: 3 };
const LEFT = "w-[10.5rem] sm:w-[23rem]";

const pct = (v: number) => formatPercent(v);
const signed = (v: number) => `${v > 0.05 ? "+" : v < -0.05 ? "−" : ""}${Math.abs(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })}`;

/**
 * Gantt chart of the project's activities (milestones).
 *
 * Each grey bar is an activity's planned window. The plan is spread evenly
 * over its days, so the planned % on any date is exactly how far the date
 * line is into the bar. The coloured fill is the realised %: when the fill
 * stops before the date line the activity is behind. Pick any date (click the
 * timeline or use the arrows) to see every activity's plan and realisation on
 * that day; click an activity to see its day-by-day table.
 */
export function GanttChart({ data }: { data: ProjectMonitoringDTO }) {
  const today = dayMs(todayInput());
  const acts = data.input.milestones;
  // open at a zoom that fits the project: short projects per day, long ones per week or month
  const [scale, setScale] = useState<Scale>(() => {
    const span = (Date.parse(data.targetEndDate.slice(0, 10)) - Date.parse((data.startDate ?? data.targetEndDate).slice(0, 10))) / DAY;
    return span <= 75 ? "DAY" : span <= 240 ? "WEEK" : "MONTH";
  });
  const [sel, setSel] = useState(today);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [act, setAct] = useState({ open: false, n: 0 });
  const scroller = useRef<HTMLDivElement>(null);

  const status = useMemo(() => activityStatusOn(data.input, sel), [data.input, sel]);
  const projPlan = useMemo(() => plannedPoints(data.input).points, [data.input]);
  const events = useMemo(() => actualEvents(data.input), [data.input]);
  const pPlan = interpolate(projPlan, sel);
  const pAct = actualAt(events, sel);

  const projStart = data.startDate ? dayMs(data.startDate.slice(0, 10)) : today;
  const projEnd = dayMs(data.targetEndDate.slice(0, 10));
  const forecastEnd = data.summary.forecastEndDate;
  const wins = status.map((s) => s.window);
  const hasPlan = wins.some(Boolean);

  const all = [projStart, projEnd, today, ...wins.flatMap((w) => (w ? [w.start, w.end] : []))];
  const min = Math.min(...all) - 2 * DAY;
  const max = Math.max(...all, forecastEnd ?? 0) + 4 * DAY;
  const days = Math.round((max - min) / DAY) + 1;
  const px = PX[scale];
  const width = days * px;
  const X = (t: number) => ((t - min) / DAY) * px;

  // keep the selected date in view when the scale changes or the chart opens
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const left = (el.querySelector("[data-gantt-left]") as HTMLElement | null)?.offsetWidth ?? 0;
    const view = el.clientWidth - left;
    el.scrollLeft = Math.max(0, X(sel) - view * 0.7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const step = (n: number) => setSel((s) => Math.min(max, Math.max(min, s + n * DAY)));
  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = min + Math.floor((e.clientX - r.left) / px) * DAY;
    setSel(Math.min(max, Math.max(min, t)));
  };

  // axis: months on top, then days / week starts
  const monthTicks: { at: number; label: string }[] = [];
  for (let d = new Date(min); d.getTime() <= max; ) {
    const at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    monthTicks.push({ at: Math.max(at, min), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` });
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  const minorTicks: { at: number; label: string; weekend?: boolean }[] = [];
  if (scale === "DAY") for (let t = min; t <= max; t += DAY) minorTicks.push({ at: t, label: String(new Date(t).getUTCDate()), weekend: [0, 6].includes(new Date(t).getUTCDay()) });
  if (scale === "WEEK") {
    let t = min + ((8 - new Date(min).getUTCDay()) % 7) * DAY; // Mondays
    for (; t <= max; t += 7 * DAY) minorTicks.push({ at: t, label: String(new Date(t).getUTCDate()) });
  }

  const behindCount = status.filter((s) => s.window && s.actual < s.plan - 0.05 && s.actual < 100).length;

  return (
    <Card>
      <CardHead
        title={
          <span className="flex items-center gap-1.5">
            Gantt chart
            <InfoTip label="Keterangan Gantt chart" guide="gantt">
              Batang abu-abu adalah rencana kegiatan, dari tanggal mulai sampai selesai. Rencana dibagi rata per hari, jadi kegiatan 20 hari direncanakan 5% per hari. Isi
              berwarna adalah realisasi. Bila isi batang belum mencapai garis tanggal, kegiatan itu tertinggal. Klik timeline untuk memilih tanggal, klik nama kegiatan untuk
              melihat tabel hariannya.
            </InfoTip>
          </span>
        }
        description={
          acts.length === 0
            ? "Tambahkan kegiatan beserta tanggal mulai dan selesai untuk membentuk Gantt chart dan kurva S."
            : `${acts.length} kegiatan, ${acts.filter((m) => m.status === "DONE").length} selesai, ${behindCount} tertinggal pada ${fmtDate(isoDay(sel))}.`
        }
        action={
          data.rights.project && acts.length > 0 ? (
            <Button size="sm" onClick={() => setAct((a) => ({ open: true, n: a.n + 1 }))}>
              <Plus className="h-4 w-4" />
              Perbarui realisasi
            </Button>
          ) : undefined
        }
      />
      <CardContent>
        {acts.length === 0 || !hasPlan ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {acts.length === 0 ? "Belum ada kegiatan." : "Kegiatan belum memiliki tanggal rencana. Ubah kegiatan dan isi rencana mulai dan selesai."}
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => step(-1)} aria-label="Hari sebelumnya" className="rounded-md border border-line p-1.5 text-slate-600 hover:bg-paper dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="w-40">
                  <Input type="date" aria-label="Tanggal yang dilihat" value={isoDay(sel)} onChange={(e) => e.target.value && setSel(dayMs(e.target.value))} className="h-8 py-1" />
                </div>
                <button type="button" onClick={() => step(1)} aria-label="Hari berikutnya" className="rounded-md border border-line p-1.5 text-slate-600 hover:bg-paper dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronRight className="h-4 w-4" />
                </button>
                {sel !== today && (
                  <button type="button" onClick={() => setSel(today)} className="ml-1 text-[12.5px] font-semibold text-accent hover:underline">
                    Hari ini
                  </button>
                )}
              </div>
              <Segmented value={scale} onChange={setScale} options={[["DAY", "Hari"], ["WEEK", "Minggu"], ["MONTH", "Bulan"]]} />
            </div>

            <div ref={scroller} className="relative max-h-[560px] overflow-auto rounded-lg border border-line dark:border-slate-700">
              <div className="relative w-max">
                {/* header */}
                <div className="sticky top-0 z-20 flex border-b border-line bg-white dark:border-slate-700 dark:bg-slate-900">
                  <div data-gantt-left className={cn(LEFT, "sticky left-0 z-30 flex shrink-0 items-end border-r border-line bg-white px-3 pb-1.5 text-[11.5px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900")}>
                    <span className="flex-1">Kegiatan</span>
                    <span className="hidden w-14 text-right sm:block">Rencana</span>
                    <span className="hidden w-16 text-right sm:block">Realisasi</span>
                    <span className="hidden w-14 text-right sm:block">Selisih</span>
                  </div>
                  <div className="relative h-11 shrink-0 cursor-pointer" style={{ width }} onClick={pick} title="Klik untuk memilih tanggal">
                    {monthTicks.map((m) => (
                      <span key={m.at} className="absolute top-1 whitespace-nowrap border-l border-line pl-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" style={{ left: X(m.at) }}>
                        {scale === "MONTH" ? m.label.replace(/ (\d{2})(\d{2})$/, " $2") : m.label}
                      </span>
                    ))}
                    {minorTicks.map((k) => (
                      <span
                        key={k.at}
                        className={cn("absolute bottom-0.5 text-center text-[10.5px] tabular-nums", k.weekend ? "text-slate-400" : "text-slate-500", k.at === sel && "font-bold text-accent")}
                        style={{ left: X(k.at), width: scale === "DAY" ? px : undefined }}
                      >
                        {k.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* body */}
                <div className="relative">
                  {/* weekend shading and reference lines */}
                  <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: "auto", width }}>
                    {scale === "DAY" && minorTicks.filter((k) => k.weekend).map((k) => <span key={k.at} className="absolute inset-y-0 bg-slate-50 dark:bg-slate-800/40" style={{ left: X(k.at), width: px }} />)}
                    {monthTicks.map((m) => <span key={m.at} className="absolute inset-y-0 border-l border-line/70 dark:border-slate-800" style={{ left: X(m.at) }} />)}
                    <span className="absolute inset-y-0 border-l-2 border-dashed border-brand-blueDark/70 dark:border-slate-300" style={{ left: X(projEnd + DAY) }} title="Target selesai" />
                    {sel !== today && <span className="absolute inset-y-0 border-l border-dashed border-slate-400" style={{ left: X(today + DAY) }} title="Hari ini" />}
                    <span className="absolute inset-y-0 z-10 border-l-2 border-accent" style={{ left: X(sel + DAY) }} title={`Tanggal dilihat ${fmtDate(isoDay(sel))}`} />
                  </div>

                  <Row
                    left={
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-bold text-ink dark:text-slate-100">Keseluruhan project</span>
                          <span className="hidden text-[11px] text-slate-500 sm:block">
                            {fmtDate(isoDay(projStart))} sampai {fmtDate(isoDay(projEnd))}
                          </span>
                          <MobileFigures plan={pPlan} actual={pAct} />
                        </span>
                        <Figures plan={pPlan} actual={pAct} bold />
                      </>
                    }
                    width={width}
                    onPick={pick}
                  >
                    <Bar left={X(projStart)} width={X(projEnd + DAY) - X(projStart)} fill={pAct} tone={pAct < pPlan - 0.05 ? "bad" : "good"} label={scale !== "MONTH" ? pct(pAct) : undefined} strong />
                  </Row>

                  {data.milestones.map((m, i) => {
                    const st = status[i];
                    const w = st.window;
                    const done = acts[i].status === "DONE" && acts[i].actualDate !== null && acts[i].actualDate! <= sel;
                    const behind = !done && st.actual < st.plan - 0.05;
                    const notStarted = w ? sel < w.start : false;
                    const open = openRow === m.id;
                    return (
                      <Fragment key={m.id}>
                        <Row
                          left={
                            <>
                              <button type="button" onClick={() => setOpenRow(open ? null : m.id)} className="flex min-w-0 flex-1 items-start gap-1 text-left" aria-expanded={open}>
                                <ChevronDown className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", !open && "-rotate-90")} aria-hidden />
                                <span className="min-w-0">
                                  <span className="block truncate text-[12.5px] font-medium text-ink dark:text-slate-100" title={m.name}>
                                    {m.name}
                                    <PackageTag data={data} id={m.packageId} />
                                  </span>
                                  <span className={cn("hidden text-[11px] sm:block", behind ? "font-semibold text-signal-expired" : "text-slate-500")}>
                                    {w ? `${fmtDate(isoDay(w.start))} sampai ${fmtDate(isoDay(w.end))}, ${windowDays(w)} hari` : "Tanggal belum diisi"}
                                  </span>
                                  <MobileFigures plan={st.plan} actual={st.actual} />
                                </span>
                              </button>
                              <Figures plan={st.plan} actual={st.actual} muted={notStarted} />
                            </>
                          }
                          width={width}
                          onPick={pick}
                        >
                          {w && (
                            <Bar
                              left={X(w.start)}
                              width={X(w.end + DAY) - X(w.start)}
                              fill={st.actual}
                              tone={done || st.actual >= 100 ? "done" : behind ? "bad" : "good"}
                              label={scale === "DAY" || (scale === "WEEK" && windowDays(w) > 10) ? pct(st.actual) : undefined}
                              title={`${m.name}\nRencana ${fmtDate(isoDay(w.start))} sampai ${fmtDate(isoDay(w.end))} (${windowDays(w)} hari, ${formatPercent(100 / windowDays(w), 2)} per hari)\nPada ${fmtDate(isoDay(sel))}: rencana ${pct(st.plan)}, realisasi ${pct(st.actual)}`}
                            />
                          )}
                        </Row>
                        {open && w && <DailyTable data={data} index={i} sel={sel} onPick={setSel} />}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-300">
              <Legend swatch="h-3 w-5 rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">Rencana</Legend>
              <Legend swatch="h-3 w-5 rounded-sm bg-accent">Realisasi sesuai rencana</Legend>
              <Legend swatch="h-3 w-5 rounded-sm bg-signal-expiredBar">Tertinggal</Legend>
              <Legend swatch="h-3 w-5 rounded-sm bg-signal-activeBar">Selesai</Legend>
              <Legend swatch="h-3 border-l-2 border-accent">Tanggal dilihat</Legend>
              <Legend swatch="h-3 border-l-2 border-dashed border-brand-blueDark">Target selesai</Legend>
              {forecastEnd && <span>Proyeksi selesai {fmtDate(isoDay(forecastEnd))}</span>}
            </div>
          </>
        )}
      </CardContent>
      {data.rights.project && <ActivityProgressModal key={act.n} data={data} open={act.open} initialDate={sel <= today ? isoDay(sel) : undefined} onClose={() => setAct((a) => ({ ...a, open: false }))} />}
    </Card>
  );
}

function Row({ left, width, children, onPick }: { left: React.ReactNode; width: number; children: React.ReactNode; onPick: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="flex border-b border-line/70 last:border-0 dark:border-slate-800">
      <div className={cn(LEFT, "sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900")}>{left}</div>
      <div className="relative shrink-0 cursor-pointer" style={{ width }} onClick={onPick}>
        {children}
      </div>
    </div>
  );
}

function Figures({ plan, actual, bold, muted }: { plan: number; actual: number; bold?: boolean; muted?: boolean }) {
  const gap = actual - plan;
  return (
    <span className={cn("hidden shrink-0 items-center text-[12px] tabular-nums sm:flex", bold && "font-bold", muted && "opacity-60")}>
      <span className="w-14 text-right text-slate-600 dark:text-slate-300">{pct(plan)}</span>
      <span className="w-16 text-right font-semibold text-ink dark:text-slate-100">{pct(actual)}</span>
      <span className={cn("w-14 text-right font-semibold", gap < -0.05 ? "text-signal-expired" : gap > 0.05 ? "text-signal-active" : "text-slate-400")}>{signed(gap)}</span>
    </span>
  );
}

function MobileFigures({ plan, actual }: { plan: number; actual: number }) {
  return (
    <span className={cn("block text-[11px] tabular-nums sm:hidden", actual < plan - 0.05 ? "text-signal-expired" : "text-slate-600 dark:text-slate-300")}>
      Rencana {pct(plan)}, realisasi {pct(actual)}
    </span>
  );
}

function Bar({ left, width, fill, tone, label, title, strong }: { left: number; width: number; fill: number; tone: "good" | "bad" | "done"; label?: string; title?: string; strong?: boolean }) {
  const color = tone === "done" ? "bg-signal-activeBar" : tone === "bad" ? "bg-signal-expiredBar" : strong ? "bg-brand-blueDark dark:bg-slate-300" : "bg-accent";
  return (
    <span className="absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" style={{ left, width: Math.max(4, width) }} title={title}>
      <span className={cn("absolute inset-y-0 left-0", color)} style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} />
      {label && width > 34 && (
        <span className={cn("absolute inset-0 flex items-center px-1.5 text-[10.5px] font-bold tabular-nums", fill > 40 ? "text-white" : "text-slate-700 dark:text-slate-200")}>{label}</span>
      )}
    </span>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={swatch} />
      {children}
    </span>
  );
}

/** Day-by-day plan and realisation of one activity, from its planned start to its end (or today, if later). */
function DailyTable({ data, index, sel, onPick }: { data: ProjectMonitoringDTO; index: number; sel: number; onPick: (t: number) => void }) {
  const a = data.input.milestones[index];
  const w = activityStatusOn(data.input, sel)[index].window!;
  const logged = new Set((a.logs ?? []).map((l) => l.t));
  const end = Math.max(w.end, Math.min(dayMs(todayInput()), w.end + 60 * DAY), ...(a.logs ?? []).map((l) => l.t));
  const rows: { t: number; plan: number; actual: number; input: boolean }[] = [];
  for (let t = w.start; t <= end && rows.length < 400; t += DAY) rows.push({ t, plan: activityPlanAt(w, t), actual: activityActualAt(a, t), input: logged.has(t) });
  const ref = useRef<HTMLTableRowElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // bring the selected date into view inside this small table only, without moving the page
  useEffect(() => {
    if (ref.current && box.current) box.current.scrollTop = Math.max(0, ref.current.offsetTop - box.current.clientHeight / 2);
  }, [sel]);
  return (
    <div className="flex border-b border-line bg-paper/60 dark:border-slate-800 dark:bg-slate-800/30">
      <div className={cn(LEFT, "sticky left-0 z-10 shrink-0 border-r border-line bg-paper px-3 py-2 dark:border-slate-700 dark:bg-slate-800")}>
        <p className="mb-1.5 text-[11.5px] text-slate-500">
          Rencana {formatPercent(100 / windowDays(w), 2)} per hari. Tanggal tebal adalah hari realisasi diisi.
        </p>
        <div ref={box} className="relative max-h-56 overflow-y-auto rounded border border-line bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-[12px] tabular-nums">
            <thead className="sticky top-0 bg-white dark:bg-slate-900">
              <tr className="text-[11px] text-slate-500">
                <th className="px-2 py-1 text-left font-semibold">Tanggal</th>
                <th className="px-2 py-1 text-right font-semibold">Rencana</th>
                <th className="px-2 py-1 text-right font-semibold">Realisasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.t}
                  ref={r.t === sel ? ref : undefined}
                  onClick={() => onPick(r.t)}
                  className={cn("cursor-pointer border-t border-line/60 hover:bg-paper dark:border-slate-800 dark:hover:bg-slate-800", r.t === sel && "bg-[#EEF5FB] dark:bg-slate-800")}
                >
                  <td className={cn("px-2 py-1", r.input ? "font-bold text-ink dark:text-slate-100" : "text-slate-600 dark:text-slate-300")}>{fmtDate(isoDay(r.t))}</td>
                  <td className="px-2 py-1 text-right text-slate-600 dark:text-slate-300">{pct(r.plan)}</td>
                  <td className={cn("px-2 py-1 text-right font-semibold", r.actual < r.plan - 0.05 ? "text-signal-expired" : "text-ink dark:text-slate-100")}>{r.t > dayMs(todayInput()) ? "-" : pct(r.actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}
