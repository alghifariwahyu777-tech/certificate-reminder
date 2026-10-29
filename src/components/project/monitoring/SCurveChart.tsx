"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildSCurve, shortDate, type MonitoringInput, type SCurveRow } from "@/lib/project-monitoring-shared";

/**
 * Planned (dashed) against actual (solid, shaded) cumulative progress from the
 * project start to its target end. Dots mark the dates progress was actually
 * reported or a milestone was completed; between them the line is straight.
 */
export function SCurveChart({ input, today, height = 300 }: { input: MonitoringInput; today: number; height?: number }) {
  const data = useMemo(() => buildSCurve(input, today), [input, today]);
  const showToday = data.length > 1 && today > data[0].t && today < data[data.length - 1].t;
  const start = data[0]?.t;
  const end = data[data.length - 1]?.t;
  const ticks = useMemo(() => monthTicks(start, end), [start, end]);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="sc-actual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1671B8" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#1671B8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E6EBF1" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={(t: number) => shortDate(t)}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={{ stroke: "#E6EBF1" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <Tooltip
            labelFormatter={(t) => shortDate(Number(t))}
            formatter={(v, name) => [`${Number(v).toLocaleString("id-ID")}%`, name]}
            contentStyle={{ borderRadius: 8, border: "1px solid #E6EBF1", fontSize: 12, fontFamily: "var(--font-body)" }}
          />
          {showToday && <ReferenceLine x={today} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Hari ini", fontSize: 10, fill: "#64748B", position: "top" }} />}
          <Line type="monotone" dataKey="planned" name="Rencana" stroke="#94A3B8" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
          <Area
            type="linear"
            dataKey="actual"
            name="Realisasi"
            stroke="#1671B8"
            strokeWidth={2.5}
            fill="url(#sc-actual)"
            connectNulls={false}
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; payload?: SCurveRow; index?: number }) =>
              p.payload?.report && p.payload.actual !== null && p.cx !== undefined && p.cy !== undefined ? (
                <circle key={`d${p.index}`} cx={p.cx} cy={p.cy} r={3.5} fill="#fff" stroke="#1671B8" strokeWidth={2} />
              ) : (
                <g key={`d${p.index}`} />
              )
            }
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tick at the first of each month (or every few months for long projects), always including the start and end. */
function monthTicks(start?: number, end?: number): number[] | undefined {
  if (start === undefined || end === undefined || end <= start) return undefined;
  const months = (end - start) / (30 * 86400000);
  const every = months <= 8 ? 1 : months <= 18 ? 2 : months <= 36 ? 3 : 6;
  const out = [start];
  const d = new Date(start);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  for (;;) {
    if (m > 11) { m -= 12; y += 1; }
    const t = Date.UTC(y, m, 1);
    if (t >= end) break;
    if (t - out[out.length - 1] > 12 * 86400000 && end - t > 12 * 86400000) out.push(t);
    m += every;
  }
  out.push(end);
  return out;
}
