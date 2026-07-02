import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { calcularEjecucionRubros, semaforoEjecucion } from "@/lib/presupuesto";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "ok", Rechazado: "C" };

export default async function RubrosPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-003", "crear") : false;

  const rubros = await prisma.rubro.findMany({ orderBy: { codigo: "asc" }, include: { fuente: true } });
  const ejecucionesPorId = await calcularEjecucionRubros(rubros.map((r) => ({ id: r.id, valorAsignado: r.valorAsignado })));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Rubros — Control de inversión</h1>
          <p className="page-sub">
            MOD-003 · meta de inversión por rubro (RN-025: Financiera propone · Administrador aprueba). Ver
            también <Link href="/fuentes" className="mono" style={{ color: "var(--blue)" }}>Fuentes de financiación →</Link>
          </p>
        </div>
        {puedeCrear ? (
          <Link href="/rubros/nuevo" className="btn btn-primary">+ Nuevo rubro</Link>
        ) : (
          <span className="badge L" title="Proponer la meta de inversión requiere escritura (E) en MOD-003 — rol Financiera">Sin registro</span>
        )}
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Rubro</th>
              <th>Fuente</th>
              <th>Asignado (meta)</th>
              <th>Comprometido</th>
              <th>Ejecutado</th>
              <th>Libre</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rubros.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay rubros.</td></tr>
            ) : (
              rubros.map((r) => {
                const ej = ejecucionesPorId.get(r.id)!;
                return (
                  <tr key={r.id}>
                    <td className="doc">{r.codigo} <span style={{ color: "var(--muted)" }}>· {r.nombre}</span></td>
                    <td>{r.fuente.codigo}</td>
                    <td className="mono">{cop.format(ej.asignado)}</td>
                    <td className="mono">{cop.format(ej.comprometido)} <span className="badge L">{ej.pctComprometido}%</span></td>
                    <td className="mono">{cop.format(ej.ejecutado)} <span className={`badge ${semaforoEjecucion(ej.pctEjecutado)}`}>{ej.pctEjecutado}%</span></td>
                    <td className="mono" style={{ color: ej.libre < 0 ? "var(--coral)" : undefined }}>{cop.format(ej.libre)}</td>
                    <td><span className={`badge ${ESTADO_BADGE[r.estado] ?? "off"}`}>{r.estado}</span></td>
                    <td><Link href={`/rubros/${r.id}`} className="btn btn-sm">Abrir</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        {rubros.length} rubro(s). <b>Comprometido</b> = cuentas de cobro ya Aprobadas (aunque no se hayan
        pagado). <b>Libre</b> = Asignado − Comprometido — lo que de verdad queda disponible para nuevas
        cuentas (RN-009).
      </p>
    </div>
  );
}
