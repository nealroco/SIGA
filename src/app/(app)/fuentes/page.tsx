import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const ESTADO_BADGE: Record<string, string> = {
  Registrada: "A",
  Aprobada: "ok",
  Rechazada: "C",
};

export default async function FuentesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-020", "crear") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.FuenteFinanciacionWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada"].includes(estado)) where.estado = estado;

  const items = await prisma.fuenteFinanciacion.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Fuentes de financiación</h1>
          <p className="page-sub">MOD-020 · gobierno financiero. Doble aprobación RN-025 (Financiera registra · Administrador aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/fuentes/nuevo" className="btn btn-primary">+ Nueva fuente</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-020 — rol Financiera">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrada">Registrada</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/fuentes" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor disponible</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay fuentes de financiación.</td></tr>
            ) : (
              items.map((f) => (
                <tr key={f.id}>
                  <td className="doc">{f.codigo}</td>
                  <td>{f.nombre}</td>
                  <td>{f.tipo ?? "—"}</td>
                  <td className="mono">{cop.format(f.valorDisponible)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[f.estado] ?? "off"}`}>{f.estado}</span></td>
                  <td><Link href={`/fuentes/${f.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} fuente(s).</p>
    </div>
  );
}
