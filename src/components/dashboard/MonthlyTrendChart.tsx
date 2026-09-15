"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MonthlyTrendChart({ data }: { data: { month: string; total: number }[] }) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return <p className="text-sm text-slate-400 py-10 text-center">Tidak ada sertifikat yang akan berakhir dalam 12 bulan ke depan.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "#E2E8F0" }}
            contentStyle={{
              borderRadius: 6,
              border: "1px solid #E2E8F0",
              fontSize: 12,
              fontFamily: "var(--font-body)",
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#B45309"
            strokeWidth={2}
            dot={{ r: 3, fill: "#B45309" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
