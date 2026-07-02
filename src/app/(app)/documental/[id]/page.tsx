import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { cargarVersion, revisarDocumento } from "@/actions/documental";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Pendiente: "off",
  Cargado: "L",
  "En revisión": "A",
  Aprobado: "ok",
  Rechazado: "C",
  "Con observaciones": "A",
};
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("es-CO") : "—");

export default async function DocumentoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentoId = Number(id);
  if (!documentoId) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-005", "ver"))) redirect("/documental");
  const rol = session.user.rol;

  const doc = await prisma.documento.findUnique({
    where: { id: documentoId },
    include: { contrato: true, versiones: { orderBy: { version: "desc" } } },
  });
  if (!doc) notFound();

  const puedeCargar = await can(rol, "MOD-005", "cargar");
  const puedeRevisar = await can(rol, "MOD-005", "editar");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{doc.tipoDocumento}</h1>
          <p className="page-sub">
            MOD-005 · <span className={`badge ${ESTADO_BADGE[doc.estado] ?? "off"}`}>{doc.estado}</span> ·{" "}
            contrato <span className="mono">{doc.contrato.numero}</span>
          </p>
        </div>
        <Link href="/documental" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Contrato:</b> <span className="mono">{doc.contrato.numero}</span></div>
          <div><b>Tipo:</b> {doc.tipoDocumento}</div>
          <div><b>Obligatorio:</b> <span className={`badge ${doc.obligatorio ? "C" : "off"}`}>{doc.obligatorio ? "Sí" : "No"}</span></div>
          <div><b>Estado:</b> <span className={`badge ${ESTADO_BADGE[doc.estado] ?? "off"}`}>{doc.estado}</span></div>
          <div><b>Archivo actual:</b> {doc.archivoUrl ? <span className="mono">{doc.archivoUrl}</span> : "—"}</div>
          <div><b>Versiones:</b> <span className="mono">{doc.versiones.length}</span></div>
        </div>
        {doc.observacion && (
          <div className="alert info" style={{ marginTop: 14 }}>Observación: {doc.observacion}</div>
        )}
      </div>

      {/* RN-012: la carga crea una versión nueva (append-only) */}
      {puedeCargar && (
        <form action={cargarVersion} className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
          <input type="hidden" name="documentoId" value={doc.id} />
          <p className="section-cap">Cargar versión</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Cada carga genera una versión nueva (RN-012); nunca se sobrescribe la evidencia anterior. El documento pasa a <b>Cargado</b>.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 260 }}>
              <label htmlFor="archivoUrl">URL del archivo <span className="req">*</span></label>
              <input id="archivoUrl" name="archivoUrl" type="url" className="input" placeholder="https://…" required />
            </div>
            <button className="btn btn-blue" type="submit">Cargar versión</button>
          </div>
        </form>
      )}

      {/* RN-012: al rechazar NO se borran versiones (append-only) */}
      {puedeRevisar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Revisar documento</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> puedes aprobar, rechazar o devolver con observaciones. El histórico de versiones se conserva (RN-012).
          </p>
          <form action={revisarDocumento} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="documentoId" value={doc.id} />
            <div className="field" style={{ marginBottom: 0, width: 220 }}>
              <label htmlFor="decision">Decisión</label>
              <select id="decision" name="decision" className="select" defaultValue="Aprobado">
                <option value="Aprobado">Aprobar</option>
                <option value="Rechazado">Rechazar</option>
                <option value="Con observaciones">Con observaciones</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
              <label htmlFor="observacion">Observación</label>
              <input id="observacion" name="observacion" className="input" placeholder="Motivo / notas de la revisión…" />
            </div>
            <button className="btn" type="submit">Guardar decisión</button>
          </form>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <p className="section-cap">Versiones (RN-012 · append-only)</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Versión</th>
                <th>Archivo</th>
                <th>Cargado por</th>
                <th>Nota</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {doc.versiones.length === 0 ? (
                <tr><td colSpan={5} className="empty">Aún no hay versiones cargadas.</td></tr>
              ) : (
                doc.versiones.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">v{v.version}</td>
                    <td>{v.archivoUrl ? <span className="mono">{v.archivoUrl}</span> : "—"}</td>
                    <td>{v.usuarioCarga ?? "—"}</td>
                    <td>{v.nota ?? "—"}</td>
                    <td className="mono">{fmt(v.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!puedeCargar && !puedeRevisar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). La carga de evidencia requiere nivel E o C; la revisión requiere E (RN-015).
        </div>
      )}
    </div>
  );
}
