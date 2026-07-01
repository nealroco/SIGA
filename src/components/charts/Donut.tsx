"use client";

/** Anillo de porcentaje, a mano (un solo valor no justifica una librería de gráficos). */
export default function Donut({ pct, size = 76, strokeWidth = 8 }: { pct: number; size?: number; strokeWidth?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="kpi-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" />
        <circle
          className="value"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="kpi-donut-label">{Math.round(clamped)}%</div>
    </div>
  );
}
