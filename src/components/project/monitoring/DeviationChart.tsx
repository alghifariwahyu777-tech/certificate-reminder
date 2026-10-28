"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actualLineAt, actualEvents, interpolate, plannedPoints, projectStart, shortDate, type MonitoringInput } from "@/lib/project-monitoring-shared";

/** Deviation (realisasi − rencana, in points) at regular dates from the project start to today. */
export function DeviationChart({ input, today }: { input: MonitoringInput; today: number }) {
  const data = useMemo(() => {
    const start = projectStart(input);
    const end = input.status === "ONGOING" ? today : Math.min(today, input.actualEndDate ?? today);
    if (end <= start) return [];
    const plan = plannedPoints(input).points;
    const events = actualEvents(input);
    const span = (end - start) / 86400000;
    const step = (span <= 120 ? 7 : span <= 540 ? 14 : 30) * 86400000;
    const times: number[] = [];
    for (let t = start + step; t < end; t += step) times.push(t);
    times.push(end);
    return times.map((t) => ({ t, dev: Math.round((actualLineAt(events, start, t) - interpolate(plan, t)) * 10) / 10 }));
  }, [input, today]);

  if (data.length < 2) return <p className="py-8 text-center text-sm text-slate-400">Grafik terbentuk setelah project berjalan lebih dari satu periode.</p>;

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#E9EDF2" vertical={false} />
          <XAxis dataKey="t" type="category" tickFormatter={(t: number) => shortDate(t)} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} minTickGap={20} />
          <YAxis tickFormatter={(v: number) => `${v}`} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <Tooltip
            labelFormatter={(t) => shortDate(Number(t))}
            formatter={(v) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toLocaleString("id-ID")} poin`, "Deviasi"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "var(--font-body)" }}
            cursor={{ fill: "#F1F5F9" }}
          />
          <ReferenceLine y={0} stroke="#94A3B8" />
          <Bar dataKey="dev" maxBarSize={22} radius={[2, 2, 2, 2]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.t} fill={d.dev < -5 ? "#C2362F" : d.dev < 0 ? "#D69E2E" : "#2F855A"} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
