import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-002", "crear") : false;

  const q = (sp.q ?? "").trim();
  const estado = sp.estado ?? "";

  const where: Prisma.PersonalWhereInput = {};
  if (q) {
    where.OR = [{ nombre: { contains: q } }, { documento: { contains: q } }, { cargo: { contains: q } }];
  }
  if (estado === "Activo" || estado === "Inactivo") where.estado = estado;

  const items = await prisma.personal.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Personal</h1>
          <p className="page-sub">MOD-002 · registro y hoja de vida del talento humano.</p>
        </div>
        {puedeCrear ? (
          <Link href="/personal/nuevo" className="btn btn-primary">+ Nuevo personal</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-002">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <input
          className="input grow"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, documento o cargo…"
        />
        <select className="select" name="estado" defaultValue={estado} style={{ width: 170 }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {(q || estado) && <Link href="/personal" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Vinculación</th>
              <th>Ingreso</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="empty">No hay personal que coincida.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td className="doc">{p.documento}</td>
                  <td>{p.nombre}</td>
                  <td>{p.cargo ?? "—"}</td>
                  <td>{p.tipoVinculacion ?? "—"}</td>
                  <td className="mono">{p.fechaIngreso ? p.fechaIngreso.toISOString().slice(0, 10) : "—"}</td>
                  <td>
                    <span className={`badge ${p.estado === "Activo" ? "ok" : "off"}`}>{p.estado}</span>
                  </td>
                  <td>
                    <Link href={`/personal/${p.id}`} className="btn btn-sm">Ver / editar</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} registro(s).</p>
    </div>
  );
}
