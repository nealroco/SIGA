import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const pct = (v: number) => `${v.toFixed(1)}%`;

// RN-021: alerta de desviación — ok si |desviación| ≤ 10, A si ≤ 20, C si > 20.
function badgeDesviacion(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 10) return "ok";
  if (abs <= 20) return "A";
  return "C";
}

export default async function ImpactoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-025", "crear") : false;

  const sp = await searchParams;
  const periodo = sp.periodo ?? "";

  const [items, periodosDisponibles] = await Promise.all([
    prisma.analisisImpacto.findMany({ where: periodo ? { periodo } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.analisisImpacto.findMany({ distinct: ["periodo"], select: { periodo: true }, orderBy: { periodo: "desc" } }),
  ]);
  const ultimo = items[0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Análisis de impacto</h1>
          <p className="page-sub">MOD-025 · cruce entre ejecución financiera y cumplimiento físico (RN-021: alerta de desviación).</p>
        </div>
        {puedeCrear ? (
          <Link href="/impacto/nuevo" className="btn btn-primary">+ Nuevo análisis</Link>
        ) : (
          <span className="badge L" title="Generar un análisis requiere escritura (E) en MOD-025">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get" style={{ marginTop: 18 }}>
        <select className="select" name="periodo" defaultValue={periodo} style={{ width: 200 }}>
          <option value="">Todos los períodos</option>
          {periodosDisponibles.map((p) => (
            <option key={p.periodo} value={p.periodo}>{p.periodo}</option>
          ))}
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {periodo && <Link href="/impacto" className="btn">Limpiar</Link>}
      </form>

      <div style={{ marginTop: 14 }}>
        <p className="section-cap">{periodo ? `Último análisis generado (período ${periodo})` : "Último análisis generado"}</p>
        {!ultimo ? (
          <div className="card" style={{ padding: 24 }}>
            <p className="empty">
              {periodo ? `Ningún análisis generado para el período ${periodo}.` : "Aún no se ha generado ningún análisis de impacto."}
            </p>
          </div>
        ) : (
          <div className="kpi-grid">
            <div className="card kpi accent">
              <div className="lab">Gasto ejecutado</div>
              <div className="val">{cop.format(ultimo.gastoEjecutado)}</div>
              <div className="hint">Período {ultimo.periodo}</div>
            </div>
            <div className="card kpi">
              <div className="lab">Cumplimiento físico</div>
              <div className="val">{pct(ultimo.cumplimientoFisico)}</div>
              <div className="hint">Promedio de indicadores activos (RN-011)</div>
            </div>
            <div className="card kpi">
              <div className="lab">Ejecución financiera</div>
              <div className="val">{pct(ultimo.ejecucionFinanciera)}</div>
              <div className="hint">Pagos / valor aprobado de cuentas de cobro</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Histórico de análisis</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Período</th>
                <th>Gasto ejecutado</th>
                <th>Cumplimiento físico</th>
                <th>Ejecución financiera</th>
                <th>Desviación</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="empty">No hay análisis de impacto generados.</td></tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id}>
                    <td className="doc">{a.periodo}</td>
                    <td className="mono">{cop.format(a.gastoEjecutado)}</td>
                    <td className="mono">{pct(a.cumplimientoFisico)}</td>
                    <td className="mono">{pct(a.ejecucionFinanciera)}</td>
                    <td>
                      <span className={`badge ${badgeDesviacion(a.desviacion)}`} title="RN-021: alerta de desviación">
                        {a.desviacion > 0 ? "+" : ""}{pct(a.desviacion)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="page-sub" style={{ marginTop: 12 }}>{items.length} análisis generado(s).</p>
      </div>
    </div>
  );
}
