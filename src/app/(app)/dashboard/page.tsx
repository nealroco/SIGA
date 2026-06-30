import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const [
    total, activos, inactivos, modulos, roles, porPrograma,
    contratosActivos, contratosPendientes,
    cuentas, pagos, docsAprobados, docsTotal,
  ] = await Promise.all([
    prisma.beneficiario.count(),
    prisma.beneficiario.count({ where: { estado: "Activo" } }),
    prisma.beneficiario.count({ where: { estado: "Inactivo" } }),
    prisma.modulo.count(),
    prisma.rol.count(),
    prisma.beneficiario.groupBy({ by: ["programa"], _count: { _all: true }, where: { estado: "Activo" } }),
    prisma.contrato.count({ where: { estado: "Aprobado" } }),
    prisma.contrato.count({ where: { estado: "Registrado" } }),
    prisma.cuentaCobro.findMany({ select: { valorAprobado: true, valorCobrado: true } }),
    prisma.pago.findMany({ where: { estado: "Aprobado" }, select: { valorPagado: true } }),
    prisma.documento.count({ where: { estado: "Aprobado" } }),
    prisma.documento.count(),
  ]);

  const totalAprobado = cuentas.reduce((acc, c) => acc + (c.valorAprobado ?? c.valorCobrado ?? 0), 0);
  const totalPagado = pagos.reduce((acc, p) => acc + p.valorPagado, 0);
  const pctEjecucion = totalAprobado > 0 ? Math.round((totalPagado / totalAprobado) * 100) : 0;
  const pctDocumental = docsTotal > 0 ? Math.round((docsAprobados / docsTotal) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Resumen operativo de la plataforma SIGA Deportes · arquitectura v4.</p>

      <div className="kpi-grid" style={{ marginTop: 22 }}>
        <div className="card kpi accent">
          <div className="lab">Beneficiarios</div>
          <div className="val">{total}</div>
          <div className="hint">MOD-001 · total registrados</div>
        </div>
        <div className="card kpi">
          <div className="lab">Activos</div>
          <div className="val">{activos}</div>
          <div className="hint">en operación</div>
        </div>
        <div className="card kpi">
          <div className="lab">Inactivos</div>
          <div className="val">{inactivos}</div>
          <div className="hint">baja lógica (RN-002)</div>
        </div>
        <div className="card kpi">
          <div className="lab">Módulos</div>
          <div className="val">{modulos}</div>
          <div className="hint">{roles} roles · matriz 9×{modulos}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <p className="section-cap">KPIs cruzados (RN-016: visibles según módulos activos)</p>
        <div className="kpi-grid">
          <div className="card kpi">
            <div className="lab">Contratos aprobados</div>
            <div className="val">{contratosActivos}</div>
            <div className="hint">{contratosPendientes} pendientes de aprobación</div>
          </div>
          <div className="card kpi">
            <div className="lab">% ejecución financiera</div>
            <div className="val">{pctEjecucion}%</div>
            <div className="hint">{cop.format(totalPagado)} / {cop.format(totalAprobado)}</div>
          </div>
          <div className="card kpi">
            <div className="lab">Expediente documental</div>
            <div className="val">{pctDocumental}%</div>
            <div className="hint">{docsAprobados} / {docsTotal} documentos aprobados</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Beneficiarios activos por programa</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Programa</th>
                <th>Activos</th>
              </tr>
            </thead>
            <tbody>
              {porPrograma.length === 0 ? (
                <tr><td colSpan={2} className="empty">Sin datos</td></tr>
              ) : (
                porPrograma
                  .sort((a, b) => b._count._all - a._count._all)
                  .map((p) => (
                    <tr key={p.programa ?? "—"}>
                      <td>{p.programa ?? "Sin programa"}</td>
                      <td className="mono">{p._count._all}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/beneficiarios" className="btn btn-blue">Ir a Beneficiarios →</Link>
        </div>
      </div>
    </div>
  );
}
