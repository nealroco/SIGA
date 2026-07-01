"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Mismos 5 tonos ya usados en el resto de la UI (var(--blue), var(--coral) + verde/ámbar/azul-info de
// .badge/.pill en globals.css) — el número de series de un cruce de 2 dimensiones es siempre pequeño
// (Sí/No, 3 tipos de afiliación, etc.), así que no hace falta la paleta de 9 tonos del donut.
const COLORES = ["#3b6bff", "#ff5a3c", "#157347", "#9a6a00", "#2747a6"];

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
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e6f2" />
          <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: "#858dae" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#858dae" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} fill={COLORES[i % COLORES.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
