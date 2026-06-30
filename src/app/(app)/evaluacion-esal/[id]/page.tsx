import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarEvaluacion, aprobarEvaluacion, rechazarEvaluacion } from "@/actions/evaluacionEsal";
import EvaluacionEsalForm from "@/components/EvaluacionEsalForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Aprobada: "ok", Rechazada: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function EvaluacionEsalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evaluacionId = Number(id);
  if (!evaluacionId) notFound();

  const e = await prisma.evaluacionEsal.findUnique({
    where: { id: evaluacionId },
    include: { tercero: true, convocatoria: true, createdBy: true, aprobadoBy: true },
  });
  if (!e) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = e.estado === "Registrada" || e.estado === "Rechazada";
  const puedeEditar = (await can(rol, "MOD-009", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-009", "aprobar")) && e.estado === "Registrada";
  const terceros = await prisma.tercero.findMany({ where: { estado: "Activo" }, orderBy: { razonSocial: "asc" } });
  const convocatorias = await prisma.convocatoria.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{e.tercero.razonSocial}</h1>
          <p className="page-sub">
            MOD-009 · <span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span> · {e.tercero.documento}
          </p>
        </div>
        <Link href="/evaluacion-esal" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Tercero:</b> {e.tercero.razonSocial} ({e.tercero.documento})</div>
          <div><b>Convocatoria:</b> {e.convocatoria?.nombre ?? "—"}</div>
          <div><b>Criterio:</b> {e.criterio ?? "—"}</div>
          <div><b>Puntaje:</b> <span className="mono">{e.puntaje != null ? e.puntaje : "—"}</span></div>
          <div><b>Registrado por:</b> {e.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {e.aprobadoBy ? `${e.aprobadoBy.nombre} · ${fmt(e.aprobadoEn)}` : "—"}</div>
        </div>
        {e.estado === "Rechazada" && e.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazada: {e.motivoRechazo}</div>
        )}
      </div>

      {/* Panel de aprobación (solo nivel A — Supervisor) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (segregación de funciones)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza a la evaluación registrada por el Administrador. No puedes aprobar una que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarEvaluacion}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar evaluación</button>
            </form>
            <form action={rechazarEvaluacion} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={e.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="motivo">Motivo de rechazo</label>
                <input id="motivo" name="motivo" className="input" placeholder="Motivo…" style={{ width: 240 }} required />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
            </form>
          </div>
        </div>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar (vuelve a estado Registrada)</p>
          <EvaluacionEsalForm
            action={editarEvaluacion}
            terceros={terceros}
            convocatorias={convocatorias}
            submitLabel="Guardar cambios"
            values={{
              id: e.id,
              terceroId: e.terceroId,
              convocatoriaId: e.convocatoriaId,
              criterio: e.criterio,
              puntaje: e.puntaje,
            }}
          />
        </div>
      )}

      {!puedeEditar && !puedeAprobar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro lo hace el Administrador (E) y la aprobación el Supervisor (A) — segregación de funciones.
        </div>
      )}
    </div>
  );
}
