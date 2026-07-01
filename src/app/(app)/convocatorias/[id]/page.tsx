import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { proponerBeneficiario, aprobarSeleccion, rechazarSeleccion, cerrarConvocatoria } from "@/actions/convocatorias";

export const dynamic = "force-dynamic";

const SEL_BADGE: Record<string, string> = { Propuesto: "A", Aprobado: "ok", Rechazado: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function ConvocatoriaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convocatoriaId = Number(id);
  if (!convocatoriaId) notFound();

  const c = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: {
      createdBy: true,
      selecciones: { include: { beneficiario: true, propuestoBy: true, aprobadoBy: true }, orderBy: { id: "asc" } },
    },
  });
  if (!c) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeSeleccionar = await can(rol, "MOD-008", "crear"); // Supervisor (E)
  const puedeAprobar = await can(rol, "MOD-008", "aprobar"); // Administrador (A)
  const puedeCerrar = puedeAprobar && c.estado !== "Cerrada";

  const yaSeleccionados = new Set(c.selecciones.map((s) => s.beneficiarioId));
  const disponibles = puedeSeleccionar
    ? (await prisma.beneficiario.findMany({ where: { estado: "Activo" }, orderBy: { nombre: "asc" } })).filter((b) => !yaSeleccionados.has(b.id))
    : [];
  const aprobados = c.selecciones.filter((s) => s.estado === "Aprobado").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{c.nombre}</h1>
          <p className="page-sub">MOD-008 · <span className="badge ok">{c.estado}</span> · cupos {aprobados}/{c.cupos}</p>
        </div>
        <Link href="/convocatorias" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 820 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Tipo:</b> {c.tipo}</div>
          <div><b>Cupos:</b> <span className="mono">{c.cupos}</span></div>
          <div><b>Apertura:</b> {fmt(c.fechaApertura)}</div>
          <div><b>Cierre:</b> {fmt(c.fechaCierre)}</div>
          <div style={{ gridColumn: "1 / -1" }}><b>Descripción:</b> {c.descripcion ?? "—"}</div>
          <div><b>Creada por:</b> {c.createdBy?.nombre ?? "—"}</div>
        </div>
      </div>

      {puedeCerrar && (
        <form action={cerrarConvocatoria} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 820, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={c.id} />
          <div>
            <b>Cerrar convocatoria</b>
            <div className="page-sub">Cierre manual del ciclo de vida de la convocatoria (nivel Aprobación).</div>
          </div>
          <button className="btn" type="submit">Cerrar</button>
        </form>
      )}

      <div style={{ marginTop: 22, maxWidth: 820 }}>
        <p className="section-cap">Selección de beneficiarios (RN-027)</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Beneficiario</th>
                <th>Estado</th>
                <th>Propuesto por</th>
                <th>Aprobado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {c.selecciones.length === 0 ? (
                <tr><td colSpan={5} className="empty">Aún no hay beneficiarios propuestos.</td></tr>
              ) : (
                c.selecciones.map((s) => (
                  <tr key={s.id}>
                    <td>{s.beneficiario.nombre} <span className="doc">· {s.beneficiario.documento}</span></td>
                    <td><span className={`badge ${SEL_BADGE[s.estado] ?? "off"}`}>{s.estado}</span></td>
                    <td>{s.propuestoBy?.nombre ?? "—"}</td>
                    <td>{s.aprobadoBy?.nombre ?? "—"}</td>
                    <td>
                      {puedeAprobar && s.estado === "Propuesto" ? (
                        <span style={{ display: "flex", gap: 8 }}>
                          <form action={aprobarSeleccion}>
                            <input type="hidden" name="seleccionId" value={s.id} />
                            <button className="btn btn-sm btn-blue" type="submit">Aprobar</button>
                          </form>
                          <form action={rechazarSeleccion}>
                            <input type="hidden" name="seleccionId" value={s.id} />
                            <button className="btn btn-sm" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
                          </form>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {puedeSeleccionar ? (
          <form action={proponerBeneficiario} className="card" style={{ padding: 18, marginTop: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="convocatoriaId" value={c.id} />
            <div className="field" style={{ marginBottom: 0, minWidth: 320 }}>
              <label htmlFor="beneficiarioId">Proponer beneficiario (rol Supervisor)</label>
              <select id="beneficiarioId" name="beneficiarioId" className="select" required defaultValue="">
                <option value="">Selecciona un beneficiario…</option>
                {disponibles.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre} · {b.documento} {b.programa ? `· ${b.programa}` : ""}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={disponibles.length === 0}>+ Proponer</button>
          </form>
        ) : (
          <div className="alert info" style={{ marginTop: 16 }}>
            Tu rol (<b>{rol}</b>) {puedeAprobar ? "puede aprobar/rechazar la selección pero no proponer beneficiarios" : "no participa en la selección"} — RN-027:
            la propone el Supervisor (E) y la aprueba el Administrador (A). La Coord. deportiva, que gestiona Beneficiarios, no selecciona (anti-nepotismo).
          </div>
        )}
      </div>
    </div>
  );
}
