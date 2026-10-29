"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Weekly snapshots: actual vs planned progress (lines) and deviation (bars). */
export function WeeklyTrendChart({
  snapshots,
}: {
  snapshots: { weekKey: string; actualPercent: number; plannedPercent: number; deviation: number }[];
}) {
  const data = [...snapshots]
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map((s) => ({ ...s, label: s.weekKey.replace(/^\d{4}-W/, "M") }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6EBF1" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E6EBF1" }} tickLine={false} />
          <YAxis yAxisId="p" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="d" orientation="right" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [name === "Deviasi" ? `${Number(v).toLocaleString("id-ID")} poin` : `${Number(v).toLocaleString("id-ID")}%`, name]}
            labelFormatter={(l, p) => (p?.[0]?.payload?.weekKey ? `Minggu ${p[0].payload.weekKey}` : String(l))}
            contentStyle={{ borderRadius: 6, border: "1px solid #E6EBF1", fontSize: 12, fontFamily: "var(--font-body)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="d" y={0} stroke="#CBD5E1" />
          <Bar yAxisId="d" dataKey="deviation" name="Deviasi" fill="#D69E2E" maxBarSize={18} radius={[2, 2, 0, 0]} />
          <Line yAxisId="p" type="monotone" dataKey="plannedPercent" name="Rencana" stroke="#94A3B8" strokeDasharray="6 4" dot={false} strokeWidth={2} />
          <Line yAxisId="p" type="monotone" dataKey="actualPercent" name="Realisasi" stroke="#1671B8" strokeWidth={2.5} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
