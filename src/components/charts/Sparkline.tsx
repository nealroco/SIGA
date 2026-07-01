"use client";

import type { PuntoMensual } from "@/lib/tendencias";

/** Tendencia mensual real, sin librería — solo se llama cuando hay suficiente historia (ver tendencias.ts). */
export default function Sparkline({ data }: { data: PuntoMensual[] }) {
  const width = 100;
  const height = 32;
  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d.count - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="kpi-spark">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline points={points} />
      </svg>
    </div>
  );
}
