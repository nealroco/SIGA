"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TICK_STYLE, GRID_STROKE, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_CURSOR_STYLE } from "./chartTheme";

const COLOR_BARRA = "#3b6bff"; // var(--blue) — literal porque recharts renderiza el fill como atributo SVG

export default function BarChartSimple({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: Math.max(180, data.length * 34) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={140} tick={{ ...TICK_STYLE, fontSize: 12, fill: "#0b1538" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={TOOLTIP_CURSOR_STYLE}
          />
          <Bar dataKey="count" fill={COLOR_BARRA} radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
