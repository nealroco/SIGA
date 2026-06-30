import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const ESTADO_BADGE: Record<string, string> = {
  Registrado: "A",
  Aprobado: "ok",
  Rechazado: "C",
  Cerrado: "off",
};

export default async function ContratosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-010", "crear") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.ContratoWhereInput = {};
  if (["Registrado", "Aprobado", "Rechazado", "Cerrado"].includes(estado)) where.estado = estado;

  const items = await prisma.contrato.findMany({ where, orderBy: { createdAt: "desc" }, include: { tercero: true } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Contratos</h1>
          <p className="page-sub">MOD-010 · vida contractual. Doble aprobación RN-025 (Financiera registra · Administrador aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/contratos/nuevo" className="btn btn-primary">+ Registrar contrato</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-010 — rol Financiera">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrado">Registrado</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
          <option value="Cerrado">Cerrado</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/contratos" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Número</th>
              <th>Objeto</th>
              <th>Tercero</th>
              <th>Valor</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay contratos.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="doc">{c.numero}</td>
                  <td>{c.objeto}</td>
                  <td>{c.tercero.razonSocial}</td>
                  <td className="mono">{cop.format(c.valorTotal)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span></td>
                  <td><Link href={`/contratos/${c.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} contrato(s).</p>
    </div>
  );
}
