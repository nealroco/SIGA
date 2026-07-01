import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarContrato, aprobarContrato, rechazarContrato, cerrarContrato } from "@/actions/contratos";
import ContratoForm from "@/components/ContratoForm";
import MapaUbicacion from "@/components/maps/MapaUbicacion";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "ok", Rechazado: "C", Cerrado: "off" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function ContratoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contratoId = Number(id);
  if (!contratoId) notFound();

  const c = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { tercero: true, createdBy: true, aprobadoBy: true, territorio: true },
  });
  if (!c) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = c.estado === "Registrado" || c.estado === "Rechazado";
  const puedeEditar = (await can(rol, "MOD-010", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-010", "aprobar")) && c.estado === "Registrado";
  const puedeCerrar = (await can(rol, "MOD-010", "aprobar")) && c.estado === "Aprobado";
  const terceros = await prisma.tercero.findMany({ where: { estado: "Activo" }, orderBy: { razonSocial: "asc" } });
  const territorios = await prisma.territorio.findMany({ where: { estado: "Activo" }, orderBy: { municipio: "asc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{c.numero}</h1>
          <p className="page-sub">
            MOD-010 · <span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span> · {c.tercero.razonSocial}
          </p>
        </div>
        <Link href="/contratos" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Objeto:</b> {c.objeto}</div>
          <div><b>Valor:</b> <span className="mono">{cop.format(c.valorTotal)}</span></div>
          <div><b>Tercero:</b> {c.tercero.razonSocial} ({c.tercero.tipo})</div>
          <div><b>Supervisor:</b> {c.supervisor ?? "—"}</div>
          <div><b>Municipio:</b> {c.territorio ? `${c.territorio.municipio}${c.territorio.zona ? " — " + c.territorio.zona : ""}` : "—"}</div>
          <div><b>Inicio:</b> {fmt(c.fechaInicio)}</div>
          <div><b>Fin:</b> {fmt(c.fechaFin)}</div>
          <div><b>Registrado por:</b> {c.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {c.aprobadoBy ? `${c.aprobadoBy.nombre} · ${fmt(c.aprobadoEn)}` : "—"}</div>
        </div>
        {c.estado === "Rechazado" && c.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazado: {c.motivoRechazo}</div>
        )}
      </div>

      <div style={{ marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Ubicación</p>
        <MapaUbicacion lat={c.territorio?.lat} lng={c.territorio?.lng} label={c.territorio?.municipio ?? c.numero} height={200} />
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza al contrato registrado por Financiera. No puedes aprobar uno que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarContrato}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar contrato</button>
            </form>
            <form action={rechazarContrato} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={c.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="motivo">Motivo de rechazo</label>
                <input id="motivo" name="motivo" className="input" placeholder="Motivo…" style={{ width: 240 }} />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
            </form>
          </div>
        </div>
      )}

      {puedeCerrar && (
        <form action={cerrarContrato} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={c.id} />
          <div>
            <b>Cerrar contrato</b>
            <div className="page-sub">Cierre del contrato aprobado (RN-013: requerirá expediente documental completo cuando exista MOD-005).</div>
          </div>
          <button className="btn" type="submit">Cerrar</button>
        </form>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar (vuelve a estado Registrado)</p>
          <ContratoForm
            action={editarContrato}
            terceros={terceros}
            territorios={territorios}
            submitLabel="Guardar cambios"
            values={{
              id: c.id,
              numero: c.numero,
              objeto: c.objeto,
              terceroId: c.terceroId,
              valorTotal: c.valorTotal,
              fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString() : null,
              fechaFin: c.fechaFin ? c.fechaFin.toISOString() : null,
              supervisor: c.supervisor,
              territorioId: c.territorioId,
            }}
          />
        </div>
      )}

      {!puedeEditar && !puedeAprobar && !puedeCerrar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro lo hace Financiera (E) y la aprobación el Administrador (A) — RN-025.
        </div>
      )}
    </div>
  );
}
