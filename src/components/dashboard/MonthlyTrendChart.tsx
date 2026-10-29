"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chart-theme";

const tooltipStyle = { borderRadius: 8, border: `1px solid ${CHART.grid}`, fontSize: 12, fontFamily: "var(--font-body)" };

/** Count of certificates ending per month. Bars, not a line: each month is a separate count. */
export function MonthlyTrendChart({ data }: { data: { month: string; total: number }[] }) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-slate-500">Tidak ada sertifikat yang berakhir dalam 12 bulan ke depan.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#F2F4F7" }} contentStyle={tooltipStyle} formatter={(v) => [`${v} sertifikat`, "Berakhir"]} />
          <Bar dataKey="total" fill={CHART.warn} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
