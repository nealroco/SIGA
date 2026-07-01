"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Paleta reutilizada de los hex ya usados por .badge/.pill/.kpi-badge en globals.css (ok/A/L/C + var(--blue)/var(--coral)
// y sus tonos claros) — no se introduce una paleta nueva; se cicla si una dimensión tiene más de 9 categorías.
const PALETA = ["#3b6bff", "#ff5a3c", "#157347", "#9a6a00", "#2747a6", "#b42318", "#586089", "#8fa8ff", "#ff7a5f"];

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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: size, height: size, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="categoria" innerRadius="60%" outerRadius="92%" paddingAngle={2} stroke="none">
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} (${Math.round((Number(value) / total) * 100)}%)`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 5, fontSize: 12.5, minWidth: 0, flex: 1 }}>
            {data.map((d, i) => (
              <li key={d.categoria} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETA[i % PALETA.length], flexShrink: 0 }} />
                <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.categoria}
                </span>
                <b style={{ marginLeft: "auto", flexShrink: 0 }}>{d.count}</b>
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
