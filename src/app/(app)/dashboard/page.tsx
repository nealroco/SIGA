import Link from "next/link";
import {
  Users, UserCheck, UserX, LayoutGrid, FileSignature, TrendingUp, FolderCheck,
  CalendarClock, Sparkles, ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { beneficiariosPorMes, tieneTendenciaSuficiente, MIN_MESES_PARA_TENDENCIA } from "@/lib/tendencias";
import { buildInsights } from "@/lib/insights";
import Sparkline from "@/components/charts/Sparkline";
import Donut from "@/components/charts/Donut";
import BarChartSimple from "@/components/charts/BarChartSimple";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Ejecuta una query y, si falla, la degrada a `fallback` en vez de tumbar toda la página. */
function safe<T>(promesa: Promise<T>, fallback: T, etiqueta: string): Promise<T> {
  return promesa.catch((err) => {
    console.error(`[dashboard] falló la consulta "${etiqueta}":`, err);
    return fallback;
  });
}

export default async function DashboardPage() {
  const [
    total, activos, inactivos, modulos, roles, porProgramaRaw,
    contratosActivos, contratosPendientes,
    cuentas, pagos, docsAprobados, docsTotal,
    tendencia,
  ] = await Promise.all([
    safe(prisma.beneficiario.count(), 0, "beneficiarios.total"),
    safe(prisma.beneficiario.count({ where: { estado: "Activo" } }), 0, "beneficiarios.activos"),
    safe(prisma.beneficiario.count({ where: { estado: "Inactivo" } }), 0, "beneficiarios.inactivos"),
    safe(prisma.modulo.count(), 0, "modulos.total"),
    safe(prisma.rol.count(), 0, "roles.total"),
    safe(prisma.beneficiario.groupBy({ by: ["programa"], _count: { _all: true }, where: { estado: "Activo" } }), [], "beneficiarios.porPrograma"),
    safe(prisma.contrato.count({ where: { estado: "Aprobado" } }), 0, "contratos.aprobados"),
    safe(prisma.contrato.count({ where: { estado: "Registrado" } }), 0, "contratos.pendientes"),
    safe(prisma.cuentaCobro.findMany({ where: { estado: { in: ["Aprobada", "Pagada"] } }, select: { valorAprobado: true } }), [], "cuentas.aprobadas"),
    safe(prisma.pago.findMany({ where: { estado: "Aprobado" }, select: { valorPagado: true } }), [], "pagos.aprobados"),
    safe(prisma.documento.count({ where: { estado: "Aprobado" } }), 0, "documentos.aprobados"),
    safe(prisma.documento.count(), 0, "documentos.total"),
    safe(beneficiariosPorMes(6), [], "beneficiarios.porMes"),
  ]);

  // Base por compromiso (no por caja): solo cuentas Aprobadas/Pagadas cuentan como "aprobado" — ver src/lib/presupuesto.ts
  const totalAprobado = cuentas.reduce((acc, c) => acc + (c.valorAprobado ?? 0), 0);
  const totalPagado = pagos.reduce((acc, p) => acc + p.valorPagado, 0);
  const pctEjecucion = totalAprobado > 0 ? Math.round((totalPagado / totalAprobado) * 100) : 0;
  const pctDocumental = docsTotal > 0 ? Math.round((docsAprobados / docsTotal) * 100) : 0;

  const porPrograma = porProgramaRaw
    .map((p) => ({ programa: p.programa ?? "Sin programa", count: p._count._all }))
    .sort((a, b) => b.count - a.count);

  const insights = buildInsights({
    porPrograma,
    contratosPendientes,
    pctDocumental,
    docsAprobados,
    docsTotal,
  });
  const [insightDistribucion, insightContratos, insightDocumental] = insights;

  // RN de degradación honesta: con menos de MIN_MESES_PARA_TENDENCIA meses reales no se dibuja
  // una tendencia — hoy la BD solo tiene un mes de historia, así que no se muestra sparkline.
  const mostrarTendencia = tieneTendenciaSuficiente(tendencia);

  const pctActivos = total > 0 ? Math.round((activos / total) * 100) : 0;
  const pctInactivos = total > 0 ? Math.round((inactivos / total) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Resumen operativo de la plataforma SIGA Deportes · arquitectura v4.</p>

      <div className="kpi-grid" style={{ marginTop: 22 }}>
        <div className="card kpi accent">
          <div className="kpi-head">
            <div className="kpi-badge"><Users /></div>
          </div>
          <div className="lab">Beneficiarios</div>
          <div className="val">{total}</div>
          <div className="hint">MOD-001 · total registrados</div>
          {mostrarTendencia ? (
            <Sparkline data={tendencia} />
          ) : (
            <span className="kpi-nodata-pill">
              <CalendarClock size={11} /> Histórico insuficiente (mín. {MIN_MESES_PARA_TENDENCIA} meses con datos)
            </span>
          )}
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <div className="kpi-badge tone-green"><UserCheck /></div>
          </div>
          <div className="lab">Activos</div>
          <div className="val">{activos}</div>
          <div className="hint">en operación</div>
          <span className="pill tone-ok"><TrendingUp size={12} /> {pctActivos}% del total</span>
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <div className="kpi-badge tone-coral"><UserX /></div>
          </div>
          <div className="lab">Inactivos</div>
          <div className="val">{inactivos}</div>
          <div className="hint">baja lógica (RN-002)</div>
          <span className={`pill ${inactivos === 0 ? "tone-ok" : "tone-info"}`}><TrendingUp size={12} /> {pctInactivos}% del total</span>
        </div>
        <div className="card kpi">
          <div className="kpi-head">
            <div className="kpi-badge tone-blue"><LayoutGrid /></div>
          </div>
          <div className="lab">Módulos</div>
          <div className="val">{modulos}</div>
          <div className="hint">{roles} roles · matriz 9×{modulos}</div>
          <span className="pill tone-ok"><LayoutGrid size={12} /> Cobertura completa</span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <p className="section-cap">KPIs cruzados (RN-016: visibles según módulos activos)</p>
        <div className="kpi-grid-2">
          <div className="card kpi">
            <div className="kpi-head">
              <div className="kpi-badge tone-blue"><FileSignature /></div>
            </div>
            <div className="lab">Contratos aprobados</div>
            <div className="val">{contratosActivos}</div>
            <div className="hint">{contratosPendientes} pendientes de aprobación</div>
            <span className={`pill tone-${insightContratos.tono}`}>
              <insightContratos.icon size={12} /> {insightContratos.titulo}
            </span>
          </div>
          <div className="card kpi">
            <div className="kpi-head">
              <div className="kpi-badge tone-amber"><TrendingUp /></div>
            </div>
            <div className="lab">% ejecución financiera</div>
            <div className="val">{pctEjecucion}%</div>
            <div className="hint">{cop.format(totalPagado)} / {cop.format(totalAprobado)}</div>
            <div className="progress-bar" role="progressbar" aria-valuenow={pctEjecucion} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.min(100, pctEjecucion)}%` }} />
            </div>
            <div className="progress-scale"><span>0%</span><span>50%</span><span>100%</span></div>
            <span className="pill tone-info"><Sparkles size={12} /> Avance financiero del presupuesto</span>
          </div>
          <div className="card kpi" style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="kpi-head">
                <div className="kpi-badge tone-blue"><FolderCheck /></div>
              </div>
              <div className="lab">Expediente documental</div>
              <div className="val">{pctDocumental}%</div>
              <div className="hint">{docsAprobados} / {docsTotal} documentos aprobados</div>
              <span className={`pill tone-${insightDocumental.tono}`}>
                <insightDocumental.icon size={12} /> {insightDocumental.titulo}
              </span>
            </div>
            <Donut pct={pctDocumental} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <div>
          <p className="section-cap">Beneficiarios activos por programa</p>
          {porPrograma.length === 0 ? (
            <div className="card" style={{ padding: 24 }}><p className="empty">Sin datos</p></div>
          ) : (
            <div className="card" style={{ padding: "18px 8px" }}>
              <BarChartSimple data={porPrograma.map((p) => ({ label: p.programa, count: p.count }))} />
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Link href="/beneficiarios" className="btn btn-blue">Ir a Beneficiarios <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div>
          <p className="section-cap">Información clave</p>
          <div className="card" style={{ padding: 18 }}>
            {[insightDistribucion, insightContratos, insightDocumental].map((insight, i) => (
              <div key={i} className="insight-row">
                <div className={`kpi-badge tone-${insight.tono === "warn" ? "coral" : insight.tono === "ok" ? "green" : "blue"}`}>
                  <insight.icon />
                </div>
                <div>
                  <div className="insight-titulo">
                    {insight.href ? <Link href={insight.href}>{insight.titulo}</Link> : insight.titulo}
                  </div>
                  <div className="insight-cuerpo">{insight.cuerpo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
