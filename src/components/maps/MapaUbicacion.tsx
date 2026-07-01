"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const MapaUbicacionInner = dynamic(() => import("./MapaUbicacionInner"), {
  ssr: false,
  loading: () => <div className="mapa-cargando">Cargando mapa…</div>,
});

/** Mapa de un solo punto — para el detalle de cualquier registro con dirección/coordenadas. */
export default function MapaUbicacion({
  lat,
  lng,
  label,
  height = 220,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  label: string;
  height?: number;
}) {
  if (lat == null || lng == null) {
    return (
      <div className="mapa-wrap" style={{ height }}>
        <div className="mapa-vacio">
          <MapPin size={20} />
          Sin coordenadas registradas para {label}.
        </div>
      </div>
    );
  }
  return (
    <div className="mapa-wrap" style={{ height }}>
      <MapaUbicacionInner lat={lat} lng={lng} label={label} />
    </div>
  );
}
