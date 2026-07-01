import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { escenariosGeo } from "@/lib/geo";
import MapaPuntos from "@/components/maps/MapaPuntos";

export const dynamic = "force-dynamic";

export default async function EscenariosPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-022", "crear") : false;

  const items = await prisma.escenario.findMany({ orderBy: { nombre: "asc" } });
  const geo = await escenariosGeo();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Escenarios</h1>
          <p className="page-sub">MOD-022 · catálogo de escenarios deportivos.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/reservas" className="btn">← Reservas</Link>
          {puedeCrear ? (
            <Link href="/reservas/escenarios/nuevo" className="btn btn-primary">+ Nuevo escenario</Link>
          ) : (
            <span className="badge L" title="Crear escenarios requiere escritura (E) en MOD-022">Sin registro</span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <p className="section-cap">Presencia de escenarios</p>
        <MapaPuntos
          puntos={geo.map((e) => ({
            lat: e.lat,
            lng: e.lng,
            label: `${e.nombre}${e.tipo ? ` · ${e.tipo}` : ""}${e.capacidad ? ` · Capacidad ${e.capacidad}` : ""}`,
          }))}
          vacioTexto="Ningún escenario tiene coordenadas registradas (MOD-024 Georeferenciación)."
        />
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Dirección</th>
              <th>Capacidad</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay escenarios.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td>{e.nombre}</td>
                  <td>{e.tipo ?? "—"}</td>
                  <td>{e.direccion ?? "—"}</td>
                  <td className="mono">{e.capacidad ?? "—"}</td>
                  <td><span className={`badge ${e.estado === "Activo" ? "ok" : "off"}`}>{e.estado}</span></td>
                  <td>
                    <Link href={`/reservas/escenarios/${e.id}`} className="btn btn-sm">Ver / editar</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} escenario(s).</p>
    </div>
  );
}
