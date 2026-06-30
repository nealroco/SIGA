import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarActa, aprobarActa, rechazarActa } from "@/actions/comite";
import ActaForm from "@/components/ActaForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Aprobada: "ok", Rechazada: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function ActaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actaId = Number(id);
  if (!actaId) notFound();

  const a = await prisma.actaComite.findUnique({
    where: { id: actaId },
    include: { createdBy: true, aprobadoBy: true },
  });
  if (!a) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = a.estado === "Registrada" || a.estado === "Rechazada";
  const puedeEditar = (await can(rol, "MOD-015", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-015", "aprobar")) && a.estado === "Registrada";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{a.tema}</h1>
          <p className="page-sub">
            MOD-015 · <span className={`badge ${ESTADO_BADGE[a.estado] ?? "off"}`}>{a.estado}</span> · {fmt(a.fecha)}
          </p>
        </div>
        <Link href="/comite" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Fecha:</b> {fmt(a.fecha)}</div>
          <div><b>Tema:</b> {a.tema}</div>
          <div style={{ gridColumn: "1 / -1" }}><b>Decisión:</b> {a.decision ?? "—"}</div>
          <div><b>Registrada por:</b> {a.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobada por:</b> {a.aprobadoBy ? `${a.aprobadoBy.nombre} · ${fmt(a.aprobadoEn)}` : "—"}</div>
        </div>
        {a.estado === "Rechazada" && a.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazada: {a.motivoRechazo}</div>
        )}
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza al acta registrada por Supervisor/Coord. deportiva. No puedes aprobar una que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarActa}>
              <input type="hidden" name="id" value={a.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar acta</button>
            </form>
            <form action={rechazarActa} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={a.id} />
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
          <ActaForm
            action={editarActa}
            submitLabel="Guardar cambios"
            values={{
              id: a.id,
              tema: a.tema,
              decision: a.decision,
              fecha: a.fecha.toISOString(),
            }}
          />
        </div>
      )}

      {!puedeEditar && !puedeAprobar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro lo hace Supervisor/Coord. deportiva (E) y la aprobación el Administrador (A) — RN-025.
        </div>
      )}
    </div>
  );
}
