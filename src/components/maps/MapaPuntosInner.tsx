"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { fixLeafletIcons } from "./leafletIconFix";

fixLeafletIcons();

export type PuntoMapa = { lat: number; lng: number; label: string };

const CENTRO_COLOMBIA: [number, number] = [4.5, -74.3];

export default function MapaPuntosInner({ puntos, zoom = 6 }: { puntos: PuntoMapa[]; zoom?: number }) {
  const centro: [number, number] = puntos.length > 0 ? [puntos[0].lat, puntos[0].lng] : CENTRO_COLOMBIA;
  return (
    <MapContainer center={centro} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]}>
          <Popup>{p.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
