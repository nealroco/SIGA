"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const COLOR_BARRA = "#3b6bff"; // var(--blue) — literal porque recharts renderiza el fill como atributo SVG

export default function BarChartSimple({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: Math.max(180, data.length * 34) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e6f2" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#858dae" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fill: "#0b1538" }} axisLine={false} tickLine={false} />
          <Bar dataKey="count" fill={COLOR_BARRA} radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
