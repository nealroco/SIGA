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
    const layer = L.heatLayer(puntos, { radius: 32, blur: 22, maxZoom: 12 }).addTo(map);
    return () => {
      map.removeLayer(layer);
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
