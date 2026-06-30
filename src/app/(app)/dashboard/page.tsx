import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [total, activos, inactivos, modulos, roles, porPrograma] = await Promise.all([
    prisma.beneficiario.count(),
    prisma.beneficiario.count({ where: { estado: "Activo" } }),
    prisma.beneficiario.count({ where: { estado: "Inactivo" } }),
    prisma.modulo.count(),
    prisma.rol.count(),
    prisma.beneficiario.groupBy({ by: ["programa"], _count: { _all: true }, where: { estado: "Activo" } }),
  ]);

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
