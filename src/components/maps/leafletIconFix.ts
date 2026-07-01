import L from "leaflet";

/**
 * Next.js/webpack no resuelve bien las rutas de los íconos por defecto de Leaflet.
 * Se usan los assets servidos por unpkg (misma versión que el paquete instalado)
 * en vez de depender del bundler para resolver los PNG.
 */
let aplicado = false;

export function fixLeafletIcons() {
  if (aplicado) return;
  aplicado = true;
  // @ts-expect-error — _getIconUrl no está tipado, es el hook interno que hay que anular
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
