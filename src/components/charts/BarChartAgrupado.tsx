"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  PALETA_CATEGORICA,
  TICK_STYLE,
  GRID_STROKE,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_CURSOR_STYLE,
} from "./chartTheme";

export default function BarChartAgrupado({
  data,
  series,
  height = 260,
}: {
  data: Array<{ categoria: string; [serie: string]: number | string }>;
  series: string[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="empty">Sin datos</p>;
  }
  return (
    <div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barGap={4} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="categoria" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={TOOLTIP_CURSOR_STYLE}
            />
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} fill={PALETA_CATEGORICA[i % PALETA_CATEGORICA.length]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {series.map((s, i) => (
          <span
            key={s}
            className="pill"
            style={{
              marginTop: 0,
              background: `${PALETA_CATEGORICA[i % PALETA_CATEGORICA.length]}1f`,
              color: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length],
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: 2, background: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length] }}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
