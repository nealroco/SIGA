import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  editarInforme,
  aprobarInforme,
  devolverInforme,
  cerrarPeriodo,
  generarCertificado,
} from "@/actions/informes";
import InformeForm from "@/components/InformeForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Radicado: "A",
  Aprobado: "ok",
  Devuelto: "C",
  "Con observaciones": "C",
};
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function InformeDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const informeId = Number(id);
  if (!informeId) notFound();

  const i = await prisma.informe.findUnique({
    where: { id: informeId },
    include: { contrato: true, createdBy: true },
  });
  if (!i) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  // MOD-006: las transiciones de estado las hace quien tiene E (no hay nivel A en la matriz).
  const puedeEditar = await can(rol, "MOD-006", "editar");
  const contratos = await prisma.contrato.findMany({
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, objeto: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{i.contrato.numero} · {i.periodo}</h1>
          <p className="page-sub">
            MOD-006 · <span className={`badge ${ESTADO_BADGE[i.estado] ?? "off"}`}>{i.estado}</span> · {i.contrato.objeto}
          </p>
        </div>
        <Link href="/informes" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Contrato:</b> {i.contrato.numero}</div>
          <div><b>Periodo:</b> <span className="mono">{i.periodo}</span></div>
          <div><b>Estado:</b> <span className={`badge ${ESTADO_BADGE[i.estado] ?? "off"}`}>{i.estado}</span></div>
          <div><b>Radicado:</b> {fmt(i.fechaRadicacion)}</div>
          <div><b>Periodo cerrado:</b> <span className={`badge ${i.periodoCerrado ? "off" : "ok"}`}>{i.periodoCerrado ? "Sí" : "No"}</span></div>
          <div><b>Certificado:</b> <span className={`badge ${i.certificadoGenerado ? "ok" : "off"}`}>{i.certificadoGenerado ? "Generado" : "No generado"}</span></div>
          <div><b>Radicado por:</b> {i.createdBy?.nombre ?? "—"}</div>
        </div>
        {i.observacion && (
          <div className="alert info" style={{ marginTop: 14 }}>Observación: {i.observacion}</div>
        )}
      </div>

      {/* MOD-006: transiciones de estado (requieren E — Administrador, Revisor, Tecnología) */}
      {puedeEditar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Gestión del informe (escritura E)</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarInforme}>
              <input type="hidden" name="id" value={i.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar</button>
            </form>
            <form action={devolverInforme} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={i.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="observacion">Observación de devolución</label>
                <input id="observacion" name="observacion" className="input" placeholder="Motivo…" style={{ width: 240 }} />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Devolver</button>
            </form>
            {!i.periodoCerrado && (
              <form action={cerrarPeriodo}>
                <input type="hidden" name="id" value={i.id} />
                <button className="btn" type="submit">Cerrar periodo</button>
              </form>
            )}
            {i.estado === "Aprobado" && !i.certificadoGenerado && (
              <form action={generarCertificado}>
                <input type="hidden" name="id" value={i.id} />
                <button className="btn btn-blue" type="submit">Generar certificado</button>
              </form>
            )}
          </div>
          <p className="page-sub" style={{ marginTop: 12 }}>
            El certificado (RN-023/RN-026) solo puede generarse cuando el informe está <b>Aprobado</b>.
            Cerrar el periodo (RN-022) impide radicar nuevos informes en ese contrato y periodo.
          </p>
        </div>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <InformeForm
            action={editarInforme}
            contratos={contratos}
            submitLabel="Guardar cambios"
            values={{
              id: i.id,
              contratoId: i.contratoId,
              periodo: i.periodo,
              observacion: i.observacion,
            }}
          />
        </div>
      )}

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Las transiciones de estado en MOD-006 las realiza quien tiene escritura (E).
        </div>
      )}
    </div>
  );
}
