import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function TerritoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-012", "crear") : false;

  const q = (sp.q ?? "").trim();
  const estado = sp.estado ?? "";

  const where: Prisma.TerritorioWhereInput = {};
  if (q) {
    where.OR = [{ codigo: { contains: q } }, { municipio: { contains: q } }, { zona: { contains: q } }];
  }
  if (estado === "Activo" || estado === "Inactivo") where.estado = estado;

  const items = await prisma.territorio.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Territorios</h1>
          <p className="page-sub">MOD-012 · caracterización territorial (municipios, zonas y población).</p>
        </div>
        {puedeCrear ? (
          <Link href="/territorios/nuevo" className="btn btn-primary">+ Nuevo territorio</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-012">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <input
          className="input grow"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por código, municipio o zona…"
        />
        <select className="select" name="estado" defaultValue={estado} style={{ width: 170 }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {(q || estado) && <Link href="/territorios" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Municipio</th>
              <th>Zona</th>
              <th>Población</th>
              <th>Coordenadas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="empty">No hay territorios que coincidan.</td></tr>
            ) : (
              items.map((t) => (
                <tr key={t.id}>
                  <td className="doc">{t.codigo}</td>
                  <td>{t.municipio}</td>
                  <td>{t.zona ?? "—"}</td>
                  <td className="mono">{t.poblacion ?? "—"}</td>
                  <td className="mono">{t.lat != null && t.lng != null ? `${t.lat}, ${t.lng}` : "—"}</td>
                  <td>
                    <span className={`badge ${t.estado === "Activo" ? "ok" : "off"}`}>{t.estado}</span>
                  </td>
                  <td>
                    <Link href={`/territorios/${t.id}`} className="btn btn-sm">Ver / editar</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} territorio(s).</p>
    </div>
  );
}
