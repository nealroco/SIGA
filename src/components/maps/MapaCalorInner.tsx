"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

const CENTRO_COLOMBIA: [number, number] = [4.5, -74.3];

function CapaCalor({ puntos }: { puntos: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    // El contenedor de Leaflet puede reportar tamaño 0 en el primer frame (antes de que termine el
    // layout) — leaflet.heat lanza IndexSizeError al crear su canvas sobre un ancho 0. Se reintenta
    // por frame hasta que el mapa reporte un tamaño real, en vez de crashear la página.
    let layer: L.Layer | undefined;
    let raf = 0;
    const tryAdd = () => {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        raf = requestAnimationFrame(tryAdd);
        return;
      }
      layer = L.heatLayer(puntos, { radius: 32, blur: 22, maxZoom: 12 }).addTo(map);
    };
    tryAdd();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (layer) map.removeLayer(layer);
    };
  }, [map, puntos]);
  return null;
}

export default function MapaCalorInner({ puntos, zoom = 6 }: { puntos: [number, number, number][]; zoom?: number }) {
  return (
    <MapContainer center={CENTRO_COLOMBIA} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CapaCalor puntos={puntos} />
    </MapContainer>
  );
}
