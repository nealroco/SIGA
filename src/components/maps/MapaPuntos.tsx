"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { PuntoMapa } from "./MapaPuntosInner";

const MapaPuntosInner = dynamic(() => import("./MapaPuntosInner"), {
  ssr: false,
  loading: () => <div className="mapa-cargando">Cargando mapa…</div>,
});

/** Mapa multi-punto — presencia de escenarios, escuelas deportivas, etc. */
export default function MapaPuntos({
  puntos,
  vacioTexto = "Sin puntos con coordenadas para mostrar.",
  height = 320,
  zoom,
}: {
  puntos: PuntoMapa[];
  vacioTexto?: string;
  height?: number;
  zoom?: number;
}) {
  if (puntos.length === 0) {
    return (
      <div className="mapa-wrap" style={{ height }}>
        <div className="mapa-vacio">
          <MapPin size={20} />
          {vacioTexto}
        </div>
      </div>
    );
  }
  return (
    <div className="mapa-wrap" style={{ height }}>
      <MapaPuntosInner puntos={puntos} zoom={zoom} />
    </div>
  );
}
