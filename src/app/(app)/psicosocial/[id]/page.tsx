import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { marcarRevisada } from "@/actions/psicosocial";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Revisada: "ok" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function EvaluacionPsicoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evaluacionId = Number(id);
  if (!evaluacionId) notFound();

  const e = await prisma.evaluacionPsicosocial.findUnique({
    where: { id: evaluacionId },
    include: { beneficiario: true, createdBy: true },
  });
  if (!e) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeEditar = await can(rol, "MOD-018", "editar");
  const puedeRevisar = puedeEditar && e.estado === "Registrada";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{e.beneficiario.nombre}</h1>
          <p className="page-sub">
            MOD-018 · <span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span> · {fmt(e.fecha)}
          </p>
        </div>
        <Link href="/psicosocial" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Beneficiario:</b> {e.beneficiario.nombre} (<span className="mono">{e.beneficiario.documento}</span>)</div>
          <div><b>Fecha:</b> {fmt(e.fecha)}</div>
          <div><b>Instrumento:</b> {e.instrumento ?? "—"}</div>
          <div><b>Resultado:</b> {e.resultado ?? "—"}</div>
          <div><b>Observación:</b> {e.observacion ?? "—"}</div>
          <div><b>Registrado por:</b> {e.createdBy?.nombre ?? "—"}</div>
        </div>
      </div>

      {puedeRevisar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Marcar como revisada</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> puedes dejar constancia de la revisión de esta evaluación psicosocial.
          </p>
          <form action={marcarRevisada} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input type="hidden" name="id" value={e.id} />
            <div className="field" style={{ marginBottom: 0, flex: "1 1 320px" }}>
              <label htmlFor="observacion">Observación</label>
              <input id="observacion" name="observacion" className="input" defaultValue={e.observacion ?? ""} placeholder="Observación de la revisión…" />
            </div>
            <button className="btn btn-blue" type="submit">✓ Marcar como revisada</button>
          </form>
        </div>
      )}

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Marcar como revisada requiere escritura (E) en MOD-018 (RN-015).
        </div>
      )}
    </div>
  );
}
