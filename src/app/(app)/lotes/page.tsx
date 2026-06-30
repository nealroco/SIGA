import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-017", "crear") : false;

  const q = (sp.q ?? "").trim();
  const estado = sp.estado ?? "";

  const where: Prisma.LoteWhereInput = {};
  if (q) {
    where.OR = [{ codigo: { contains: q } }, { direccion: { contains: q } }, { territorio: { contains: q } }];
  }
  if (estado === "Activo" || estado === "Inactivo") where.estado = estado;

  const items = await prisma.lote.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Lotes</h1>
          <p className="page-sub">MOD-017 · gestión de lotes y predios.</p>
        </div>
        {puedeCrear ? (
          <Link href="/lotes/nuevo" className="btn btn-primary">+ Nuevo lote</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-017">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <input
          className="input grow"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por código, dirección o territorio…"
        />
        <select className="select" name="estado" defaultValue={estado} style={{ width: 170 }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {(q || estado) && <Link href="/lotes" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Dirección</th>
              <th>Territorio</th>
              <th>Área (m²)</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay lotes que coincidan.</td></tr>
            ) : (
              items.map((l) => (
                <tr key={l.id}>
                  <td className="doc">{l.codigo}</td>
                  <td>{l.direccion ?? "—"}</td>
                  <td>{l.territorio ?? "—"}</td>
                  <td className="mono">{l.area ?? "—"}</td>
                  <td>
                    <span className={`badge ${l.estado === "Activo" ? "ok" : "off"}`}>{l.estado}</span>
                  </td>
                  <td>
                    <Link href={`/lotes/${l.id}`} className="btn btn-sm">Ver / editar</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} lote(s).</p>
    </div>
  );
}
