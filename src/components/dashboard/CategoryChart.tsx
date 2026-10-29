"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chart-theme";

const tooltipStyle = { borderRadius: 8, border: `1px solid ${CHART.grid}`, fontSize: 12, fontFamily: "var(--font-body)" };

export function CategoryChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Belum ada kategori.</p>;
  }
  const sorted = [...data].sort((a, b) => b.total - a.total);

  return (
    <div style={{ height: Math.max(180, sorted.length * 34 + 20) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#F2F4F7" }} contentStyle={tooltipStyle} formatter={(v) => [`${v} sertifikat`, "Jumlah"]} />
          <Bar dataKey="total" fill={CHART.blue} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
            <LabelList dataKey="total" position="right" style={{ fontSize: 11.5, fill: CHART.axis, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
