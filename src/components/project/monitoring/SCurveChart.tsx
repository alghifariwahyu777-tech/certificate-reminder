"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildSCurve, shortDate, type MonitoringInput } from "@/lib/project-monitoring-shared";

export function SCurveChart({ input, today, height = 300 }: { input: MonitoringInput; today: number; height?: number }) {
  const data = useMemo(() => buildSCurve(input, today), [input, today]);
  const showToday = data.length > 1 && today > data[0].t && today < data[data.length - 1].t;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => shortDate(t)}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(t) => shortDate(Number(t))}
            formatter={(v, name) => [`${Number(v).toLocaleString("id-ID")}%`, name]}
            contentStyle={{ borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "var(--font-body)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showToday && <ReferenceLine x={today} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: "Hari ini", fontSize: 10, fill: "#64748B", position: "insideTopRight" }} />}
          <Line type="monotone" dataKey="planned" name="Rencana" stroke="#94A3B8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
          <Line type="stepAfter" dataKey="actual" name="Realisasi" stroke="#1D4ED8" strokeWidth={2.5} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
