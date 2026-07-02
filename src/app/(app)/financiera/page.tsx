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
  Pagada: "L",
};

export default async function FinancieraPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-003", "crear") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.CuentaCobroWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada", "Pagada"].includes(estado)) where.estado = estado;

  const items = await prisma.cuentaCobro.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      periodo: true,
      valorCobrado: true,
      valorAprobado: true,
      estado: true,
      contrato: { select: { numero: true } },
      rubro: { select: { nombre: true } },
      pagos: { where: { estado: "Aprobado" }, select: { valorPagado: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Financiera</h1>
          <p className="page-sub">
            MOD-003 · cuentas de cobro y órdenes de pago (no en línea). Doble aprobación RN-025 (Financiera
            registra · Administrador aprueba). Ver <Link href="/rubros" className="mono" style={{ color: "var(--blue)" }}>Rubros y control de inversión →</Link>
          </p>
        </div>
        {puedeCrear ? (
          <Link href="/financiera/nuevo" className="btn btn-primary">+ Nueva cuenta</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-003 — rol Financiera">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrada">Registrada</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
          <option value="Pagada">Pagada</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/financiera" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Rubro</th>
              <th>Período</th>
              <th>Cobrado / Aprobado</th>
              <th>Pagado</th>
              <th>Saldo causado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay cuentas de cobro.</td></tr>
            ) : (
              items.map((c) => {
                const totalPagado = c.pagos.reduce((acc, p) => acc + p.valorPagado, 0);
                const saldoCausado = (c.valorAprobado ?? 0) - totalPagado;
                return (
                  <tr key={c.id}>
                    <td className="doc">{c.contrato.numero}</td>
                    <td>{c.rubro.nombre}</td>
                    <td>{c.periodo}</td>
                    <td className="mono">{cop.format(c.valorCobrado)}{c.valorAprobado != null ? ` / ${cop.format(c.valorAprobado)}` : ""}</td>
                    <td className="mono">{cop.format(totalPagado)}</td>
                    <td className="mono">{cop.format(saldoCausado)}</td>
                    <td><span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span></td>
                    <td><Link href={`/financiera/${c.id}`} className="btn btn-sm">Abrir</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} cuenta(s) de cobro.</p>
    </div>
  );
}
