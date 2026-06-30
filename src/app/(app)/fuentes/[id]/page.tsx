import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarFuente, aprobarFuente, rechazarFuente } from "@/actions/fuentes";
import FuenteForm from "@/components/FuenteForm";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Aprobada: "ok", Rechazada: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function FuenteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fuenteId = Number(id);
  if (!fuenteId) notFound();

  const f = await prisma.fuenteFinanciacion.findUnique({
    where: { id: fuenteId },
    include: { createdBy: true, aprobadoBy: true },
  });
  if (!f) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = f.estado !== "Aprobada";
  const puedeEditar = (await can(rol, "MOD-020", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-020", "aprobar")) && f.estado === "Registrada";

  const rubros = await prisma.rubro.findMany({ where: { fuenteId: f.id }, orderBy: { codigo: "asc" } });
  const comprometido = rubros.filter((r) => r.estado === "Aprobado").reduce((acc, r) => acc + r.valorAsignado, 0);
  const libre = f.valorDisponible - comprometido;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{f.codigo}</h1>
          <p className="page-sub">
            MOD-020 · <span className={`badge ${ESTADO_BADGE[f.estado] ?? "off"}`}>{f.estado}</span> · {f.nombre}
          </p>
        </div>
        <Link href="/fuentes" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Nombre:</b> {f.nombre}</div>
          <div><b>Tipo:</b> {f.tipo ?? "—"}</div>
          <div><b>Valor disponible:</b> <span className="mono">{cop.format(f.valorDisponible)}</span></div>
          <div><b>Comprometido en rubros:</b> <span className="mono">{cop.format(comprometido)}</span></div>
          <div><b>Libre:</b> <span className="mono" style={{ color: libre < 0 ? "var(--coral)" : undefined }}>{cop.format(libre)}</span></div>
          <div><b>Vigencia:</b> {f.vigencia ?? "—"}</div>
          <div><b>Registrado por:</b> {f.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {f.aprobadoBy ? `${f.aprobadoBy.nombre} · ${fmt(f.aprobadoEn)}` : "—"}</div>
        </div>
        {f.estado === "Rechazada" && f.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazada: {f.motivoRechazo}</div>
        )}
      </div>

      <div className="table-wrap" style={{ marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Rubros de esta fuente</p>
        <table className="data">
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Meta de inversión</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {rubros.length === 0 ? (
              <tr><td colSpan={5} className="empty">Esta fuente aún no tiene rubros.</td></tr>
            ) : (
              rubros.map((r) => (
                <tr key={r.id}>
                  <td className="doc">{r.codigo}</td>
                  <td>{r.nombre}</td>
                  <td className="mono">{cop.format(r.valorAsignado)}</td>
                  <td><span className={`badge ${r.estado === "Aprobado" ? "ok" : r.estado === "Rechazado" ? "C" : "A"}`}>{r.estado}</span></td>
                  <td><Link href={`/rubros/${r.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Link href="/rubros/nuevo" className="btn btn-sm">+ Nuevo rubro en esta fuente</Link>
        </div>
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza a la fuente registrada por Financiera. No puedes aprobar lo que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarFuente}>
              <input type="hidden" name="id" value={f.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar fuente</button>
            </form>
            <form action={rechazarFuente} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={f.id} />
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
          <FuenteForm
            action={editarFuente}
            submitLabel="Guardar cambios"
            values={{
              id: f.id,
              codigo: f.codigo,
              nombre: f.nombre,
              tipo: f.tipo,
              valorDisponible: f.valorDisponible,
              vigencia: f.vigencia,
            }}
          />
        </div>
      )}

      {!puedeEditar && !puedeAprobar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro lo hace Financiera (E) y la aprobación el Administrador (A) — RN-025.
        </div>
      )}
    </div>
  );
}
