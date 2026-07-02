import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Semáforo de cumplimiento — RN-019/RN-021: ok >=90%, A 70-89%, C <70%. */
function badgeCumplimiento(pct: number): string {
  if (pct >= 90) return "ok";
  if (pct >= 70) return "A";
  return "C";
}

export default async function IndicadoresPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-016", "crear") : false;

  const indicadores = await prisma.indicadorFisico.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const acumulados = await prisma.avanceMeta.groupBy({
    by: ["indicadorId"],
    where: { estado: "Aprobado", indicadorId: { in: indicadores.map((i) => i.id) } },
    _sum: { cantidadAprobada: true },
  });
  const acumuladoPorIndicador = new Map(acumulados.map((a) => [a.indicadorId, a._sum.cantidadAprobada ?? 0]));

  const filas = indicadores.map((i) => {
    const acumulado = acumuladoPorIndicador.get(i.id) ?? 0;
    const pct = i.programado > 0 ? Math.round((acumulado / i.programado) * 100) : 0;
    return { ...i, acumulado, pct };
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Indicadores físicos</h1>
          <p className="page-sub">
            MOD-016 · cumplimiento = avances Aprobados / meta programada (RN-011). Sin nivel de Aprobación (A) en la
            matriz de este módulo — la aprobación del avance usa el mismo nivel Edición (E).
          </p>
        </div>
        {puedeCrear ? (
          <Link href="/indicadores/nuevo" className="btn btn-primary">+ Nuevo indicador</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-016">Sin registro</span>
        )}
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Período</th>
              <th>Programado</th>
              <th>Acumulado (Aprobado)</th>
              <th>Cumplimiento</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay indicadores registrados.</td></tr>
            ) : (
              filas.map((i) => (
                <tr key={i.id}>
                  <td className="doc">{i.codigo}</td>
                  <td>{i.nombre}</td>
                  <td>{i.periodo}</td>
                  <td className="mono">{i.programado} {i.unidad ?? ""}</td>
                  <td className="mono">{i.acumulado} {i.unidad ?? ""}</td>
                  <td><span className={`badge ${badgeCumplimiento(i.pct)}`}>{i.pct}%</span></td>
                  <td><span className={`badge ${i.estado === "Activo" ? "ok" : "off"}`}>{i.estado}</span></td>
                  <td><Link href={`/indicadores/${i.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{filas.length} indicador(es).</p>
    </div>
  );
}
