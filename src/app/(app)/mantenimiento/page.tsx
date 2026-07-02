import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { iniciarMantenimiento } from "@/actions/mantenimiento";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

const ESTADO_BADGE: Record<string, string> = {
  Programado: "L",
  "En curso": "A",
  Cerrado: "off",
};

export default async function MantenimientoPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-023", "crear") : false;
  const puedeEditar = session ? await can(session.user.rol, "MOD-023", "editar") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.MantenimientoWhereInput = {};
  if (["Programado", "En curso", "Cerrado"].includes(estado)) where.estado = estado;

  const items = await prisma.mantenimiento.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      tipo: true,
      fechaInicio: true,
      fechaFin: true,
      costo: true,
      estado: true,
      cerradoATiempo: true,
      escenario: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Mantenimiento de escenarios</h1>
          <p className="page-sub">MOD-023 · mantenimientos programados, correctivos y de emergencia sobre los escenarios deportivos.</p>
        </div>
        {puedeCrear ? (
          <Link href="/mantenimiento/nuevo" className="btn btn-primary">+ Nuevo mantenimiento</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-023 — roles Administrador / Infraestructura">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Programado">Programado</option>
          <option value="En curso">En curso</option>
          <option value="Cerrado">Cerrado</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/mantenimiento" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Escenario</th>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Costo</th>
              <th>Estado</th>
              <th>A tiempo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay mantenimientos.</td></tr>
            ) : (
              items.map((m) => (
                <tr key={m.id}>
                  <td>{m.escenario.nombre}</td>
                  <td>{m.tipo}</td>
                  <td>{fmt(m.fechaInicio)}</td>
                  <td>{fmt(m.fechaFin)}</td>
                  <td className="mono">{cop.format(m.costo)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[m.estado] ?? "off"}`}>{m.estado}</span></td>
                  <td>
                    {m.estado === "Cerrado"
                      ? (m.cerradoATiempo ? <span title="Cerrado a tiempo">✓</span> : <span title="Cerrado fuera de tiempo">✗</span>)
                      : "—"}
                  </td>
                  <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Link href={`/mantenimiento/${m.id}`} className="btn btn-sm">Abrir</Link>
                    {puedeEditar && m.estado === "Programado" && (
                      <form action={iniciarMantenimiento}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn btn-sm btn-blue" type="submit">Iniciar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} mantenimiento(s).</p>
    </div>
  );
}
