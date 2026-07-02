import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { aprobarAvance, rechazarAvance } from "@/actions/indicadores";
import AvanceForm from "@/components/AvanceForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Reportado: "A", Aprobado: "ok", Rechazado: "C" };

/** Semáforo de cumplimiento — RN-019/RN-021: ok >=90%, A 70-89%, C <70%. */
function badgeCumplimiento(pct: number): string {
  if (pct >= 90) return "ok";
  if (pct >= 70) return "A";
  return "C";
}

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function IndicadorDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const indicadorId = Number(id);
  if (!indicadorId) notFound();

  const indicador = await prisma.indicadorFisico.findUnique({
    where: { id: indicadorId },
    include: {
      avances: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, nombre: true } },
          aprobadoBy: { select: { id: true, nombre: true } },
        },
      },
    },
  });
  if (!indicador) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  // MOD-016: sin nivel A en la matriz — la "aprobación" del avance se gatea con el mismo
  // nivel "editar" (E), sin chequeo de segregación de funciones (no aplica RN-025 aquí).
  const puedeCrear = await can(rol, "MOD-016", "crear");
  const puedeEditar = await can(rol, "MOD-016", "editar");

  const acumulado = indicador.avances
    .filter((a) => a.estado === "Aprobado")
    .reduce((acc, a) => acc + (a.cantidadAprobada ?? 0), 0);
  const pct = indicador.programado > 0 ? Math.round((acumulado / indicador.programado) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{indicador.codigo}</h1>
          <p className="page-sub">
            MOD-016 · {indicador.nombre} · <span className={`badge ${indicador.estado === "Activo" ? "ok" : "off"}`}>{indicador.estado}</span>
          </p>
        </div>
        <Link href="/indicadores" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Cumplimiento</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Programado:</b> <span className="mono">{indicador.programado} {indicador.unidad ?? ""}</span></div>
          <div><b>Acumulado (Aprobado):</b> <span className="mono">{acumulado} {indicador.unidad ?? ""}</span></div>
          <div><b>Período:</b> {indicador.periodo}</div>
          <div><b>Cumplimiento:</b> <span className={`badge ${badgeCumplimiento(pct)}`}>{pct}%</span></div>
        </div>
        <div style={{ marginTop: 14, height: 10, borderRadius: 6, background: "var(--n850, #eee)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(pct, 100)}%`,
              background: pct >= 90 ? "#157347" : pct >= 70 ? "#9a6a00" : "#b5482b",
            }}
          />
        </div>
        <p className="page-sub" style={{ marginTop: 10 }}>
          RN-011: solo los avances en estado <b>Aprobado</b> suman al cumplimiento.
        </p>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Avances reportados</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Reportado</th>
                <th>Aprobado</th>
                <th>Estado</th>
                <th>Período</th>
                <th>Reportado por</th>
                <th>Aprobado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {indicador.avances.length === 0 ? (
                <tr><td colSpan={7} className="empty">No hay avances reportados.</td></tr>
              ) : (
                indicador.avances.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.cantidadReportada}</td>
                    <td className="mono">{a.cantidadAprobada ?? "—"}</td>
                    <td><span className={`badge ${ESTADO_BADGE[a.estado] ?? "off"}`}>{a.estado}</span></td>
                    <td>{a.periodo ?? "—"}</td>
                    <td>{a.createdBy?.nombre ?? "—"}</td>
                    <td>{a.aprobadoBy ? `${a.aprobadoBy.nombre} · ${fmt(a.aprobadoEn)}` : "—"}</td>
                    <td>
                      {puedeEditar && a.estado === "Reportado" ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <form action={aprobarAvance}>
                            <input type="hidden" name="id" value={a.id} />
                            <button className="btn btn-sm btn-blue" type="submit">✓ Aprobar</button>
                          </form>
                          <form action={rechazarAvance} style={{ display: "flex", gap: 6 }}>
                            <input type="hidden" name="id" value={a.id} />
                            <input name="motivo" className="input" placeholder="Motivo…" style={{ width: 140 }} required />
                            <button className="btn btn-sm" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
                          </form>
                        </div>
                      ) : null}
                      {a.estado === "Rechazado" && a.motivoRechazo ? (
                        <span className="page-sub">Motivo: {a.motivoRechazo}</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {puedeCrear ? (
        <AvanceForm indicadores={[{ id: indicador.id, codigo: indicador.codigo, nombre: indicador.nombre, programado: indicador.programado }]} />
      ) : (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Reportar avances requiere <b>escritura (E)</b> en MOD-016. Tu rol (<b>{rol}</b>) tiene acceso de solo lectura.
        </div>
      )}
    </div>
  );
}
