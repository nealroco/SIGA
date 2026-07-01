"use client";

import dynamic from "next/dynamic";
import { Flame } from "lucide-react";

const MapaCalorInner = dynamic(() => import("./MapaCalorInner"), {
  ssr: false,
  loading: () => <div className="mapa-cargando">Cargando mapa…</div>,
});

export type PuntoCalor = { lat: number; lng: number; peso: number };

/** Mapa de calor — concentración de población/inversión por territorio. */
export default function MapaCalor({
  puntos,
  vacioTexto = "Sin datos suficientes para el mapa de calor.",
  height = 320,
  zoom,
}: {
  puntos: PuntoCalor[];
  vacioTexto?: string;
  height?: number;
  zoom?: number;
}) {
  const conPeso = puntos.filter((p) => p.peso > 0);
  if (conPeso.length === 0) {
    return (
      <div className="mapa-wrap" style={{ height }}>
        <div className="mapa-vacio">
          <Flame size={20} />
          {vacioTexto}
        </div>
      </div>
    );
  }
  const data: [number, number, number][] = conPeso.map((p) => [p.lat, p.lng, p.peso]);
  return (
    <div className="mapa-wrap" style={{ height }}>
      <MapaCalorInner puntos={data} zoom={zoom} />
    </div>
  );
}
