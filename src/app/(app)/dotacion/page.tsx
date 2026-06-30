import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Entregada: "ok",
  Devuelta: "off",
};

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CO");

export default async function DotacionPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session
    ? (await can(session.user.rol, "MOD-013", "crear")) || (await can(session.user.rol, "MOD-013", "cargar"))
    : false;

  const estado = sp.estado ?? "";
  const where: Prisma.DotacionEntregaWhereInput = {};
  if (["Entregada", "Devuelta"].includes(estado)) where.estado = estado;

  const items = await prisma.dotacionEntrega.findMany({
    where,
    orderBy: { fechaEntrega: "desc" },
    include: { beneficiario: true, item: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Dotación deportiva</h1>
          <p className="page-sub">MOD-013 · entrega de implementos deportivos a beneficiarios.</p>
        </div>
        {puedeCrear ? (
          <Link href="/dotacion/nuevo" className="btn btn-primary">+ Nueva entrega</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) o carga (C) en MOD-013">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Entregada">Entregada</option>
          <option value="Devuelta">Devuelta</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/dotacion" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Beneficiario</th>
              <th>Ítem</th>
              <th>Cantidad</th>
              <th>Fecha entrega</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay entregas de dotación.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td>{e.beneficiario.nombre}</td>
                  <td>{e.item.nombre}</td>
                  <td className="mono">{e.cantidad}</td>
                  <td>{fmt(e.fechaEntrega)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span></td>
                  <td><Link href={`/dotacion/${e.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} entrega(s).</p>
    </div>
  );
}
