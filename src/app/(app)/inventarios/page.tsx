import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Activo: "ok",
  Inactivo: "off",
};

export default async function InventariosPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-004", "crear") : false;

  const q = sp.q?.trim() ?? "";
  const estado = sp.estado ?? "";
  const where: Prisma.ItemWhereInput = {};
  if (["Activo", "Inactivo"].includes(estado)) where.estado = estado;
  if (q) {
    where.OR = [
      { codigo: { contains: q } },
      { nombre: { contains: q } },
      { categoria: { contains: q } },
      { ubicacion: { contains: q } },
    ];
  }

  const items = await prisma.item.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Inventarios</h1>
          <p className="page-sub">MOD-004 · ítems, cantidades y ubicación. La baja es lógica (RN-002).</p>
        </div>
        {puedeCrear ? (
          <Link href="/inventarios/nuevo" className="btn btn-primary">+ Registrar ítem</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-004">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <input className="input grow" type="text" name="q" placeholder="Buscar por código, nombre, categoría o ubicación…" defaultValue={q} />
        <select className="select" name="estado" defaultValue={estado} style={{ width: 180 }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {(q || estado) && <Link href="/inventarios" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="empty">No hay ítems registrados.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td className="doc">{it.codigo}</td>
                  <td>{it.nombre}</td>
                  <td>{it.categoria ?? "—"}</td>
                  <td>{it.ubicacion ?? "—"}</td>
                  <td className="mono">{it.cantidad}</td>
                  <td><span className={`badge ${ESTADO_BADGE[it.estado] ?? "off"}`}>{it.estado}</span></td>
                  <td><Link href={`/inventarios/${it.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} ítem(s).</p>
    </div>
  );
}
