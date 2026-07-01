"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PALETA_CATEGORICA, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } from "./chartTheme";

export default function DonutCategorias({
  titulo,
  data,
  size = 150,
}: {
  titulo: string;
  data: { categoria: string; count: number }[];
  size?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="card" style={{ padding: 16 }}>
      <p className="section-cap" style={{ marginTop: 0 }}>{titulo}</p>
      {total === 0 ? (
        <p className="empty">Sin datos</p>
      ) : (
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="categoria"
                  innerRadius="62%"
                  outerRadius="96%"
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETA_CATEGORICA[i % PALETA_CATEGORICA.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  formatter={(value, name) => [`${value} (${Math.round((Number(value) / total) * 100)}%)`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21, color: "var(--ink)", lineHeight: 1 }}>
                  {total}
                </div>
                <div style={{ fontSize: 9, color: "var(--muted-2)", letterSpacing: ".05em", textTransform: "uppercase", marginTop: 2 }}>
                  total
                </div>
              </div>
            </div>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, fontSize: 12.5, minWidth: 0, flex: 1 }}>
            {data.map((d, i) => (
              <li key={d.categoria} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: PALETA_CATEGORICA[i % PALETA_CATEGORICA.length],
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.categoria}
                </span>
                <b style={{ marginLeft: "auto", flexShrink: 0, color: "var(--ink)" }}>{d.count}</b>
                <span style={{ color: "var(--muted-2)", width: 36, textAlign: "right", flexShrink: 0 }}>
                  {Math.round((d.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
