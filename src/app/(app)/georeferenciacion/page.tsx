import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function GeoreferenciacionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-024", "ver"))) redirect("/dashboard");
  const puedeEditar = await can(session.user.rol, "MOD-024", "editar");

  const territorios = await prisma.territorio.findMany({
    orderBy: { codigo: "asc" },
    take: 200,
    select: { id: true, codigo: true, municipio: true, lat: true, lng: true },
  });
  const escenarios = await prisma.escenario.findMany({
    orderBy: { nombre: "asc" },
    take: 200,
    select: { id: true, nombre: true, tipo: true, lat: true, lng: true },
  });

  return (
    <div>
      <h1 className="page-title">Georeferenciación</h1>
      <p className="page-sub">MOD-024 · ubicación geográfica (lat/lng) de territorios y escenarios.</p>

      <p className="section-cap" style={{ marginTop: 24 }}>Territorios</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Municipio</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {territorios.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay territorios.</td></tr>
            ) : (
              territorios.map((t) => (
                <tr key={t.id}>
                  <td className="doc">{t.codigo}</td>
                  <td>{t.municipio}</td>
                  <td className="mono">{t.lat ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</td>
                  <td className="mono">{t.lng ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</td>
                  <td>
                    <Link href={`/georeferenciacion/Territorio/${t.id}`} className="btn btn-sm">
                      {t.lat != null && t.lng != null ? "Editar" : "Ubicar"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{territorios.length} territorio(s).</p>

      <p className="section-cap" style={{ marginTop: 24 }}>Escenarios</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {escenarios.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay escenarios.</td></tr>
            ) : (
              escenarios.map((e) => (
                <tr key={e.id}>
                  <td className="doc">{e.nombre}</td>
                  <td>{e.tipo ?? "—"}</td>
                  <td className="mono">{e.lat ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</td>
                  <td className="mono">{e.lng ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</td>
                  <td>
                    <Link href={`/georeferenciacion/Escenario/${e.id}`} className="btn btn-sm">
                      {e.lat != null && e.lng != null ? "Editar" : "Ubicar"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{escenarios.length} escenario(s).</p>

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Editar coordenadas requiere <b>escritura (E)</b> en MOD-024. Tu rol (<b>{session?.user.rol}</b>) tiene acceso de solo lectura.
        </div>
      )}
    </div>
  );
}
