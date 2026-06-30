import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarPoliza, aprobarPoliza, rechazarPoliza } from "@/actions/polizas";
import PolizaForm from "@/components/PolizaForm";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Aprobada: "ok", Rechazada: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function PolizaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const polizaId = Number(id);
  if (!polizaId) notFound();

  const p = await prisma.poliza.findUnique({
    where: { id: polizaId },
    include: { contrato: true, createdBy: true, aprobadoBy: true },
  });
  if (!p) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = p.estado === "Registrada" || p.estado === "Rechazada";
  const puedeEditar = (await can(rol, "MOD-014", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-014", "aprobar")) && p.estado === "Registrada";
  const contratos = await prisma.contrato.findMany({ orderBy: { numero: "asc" } });

  const hoy = new Date();
  const vencida = p.estado === "Aprobada" && p.vigenciaHasta != null && p.vigenciaHasta < hoy;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Póliza · {p.contrato.numero}</h1>
          <p className="page-sub">
            MOD-014 · <span className={`badge ${ESTADO_BADGE[p.estado] ?? "off"}`}>{p.estado}</span>{" "}
            {vencida && (
              <span className="badge" style={{ marginLeft: 6, background: "#fdecea", color: "#b42318", borderColor: "#f6c9c3" }}>
                Vencida
              </span>
            )}{" "}
            · {p.contrato.objeto}
          </p>
        </div>
        <Link href="/polizas" className="btn">← Volver</Link>
      </div>

      {vencida && (
        <div className="alert error" style={{ marginTop: 18, maxWidth: 760 }}>
          Esta póliza está vencida (bloquea RN-018 sobre cuentas de cobro de este contrato).
        </div>
      )}

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Contrato:</b> {p.contrato.numero} — {p.contrato.objeto}</div>
          <div><b>Tipo:</b> {p.tipo ?? "—"}</div>
          <div><b>Aseguradora:</b> {p.aseguradora ?? "—"}</div>
          <div><b>Valor:</b> <span className="mono">{cop.format(p.valor)}</span></div>
          <div><b>Vigencia desde:</b> {fmt(p.vigenciaDesde)}</div>
          <div><b>Vigencia hasta:</b> {fmt(p.vigenciaHasta)}</div>
          <div><b>Registrado por:</b> {p.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {p.aprobadoBy ? `${p.aprobadoBy.nombre} · ${fmt(p.aprobadoEn)}` : "—"}</div>
        </div>
        {p.estado === "Rechazada" && p.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazada: {p.motivoRechazo}</div>
        )}
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza a la póliza registrada por Financiera. No puedes aprobar lo que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarPoliza}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar póliza</button>
            </form>
            <form action={rechazarPoliza} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={p.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="motivo">Motivo de rechazo</label>
                <input id="motivo" name="motivo" className="input" placeholder="Motivo…" style={{ width: 240 }} />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
            </form>
          </div>
        </div>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar (vuelve a estado Registrada)</p>
          <PolizaForm
            action={editarPoliza}
            contratos={contratos}
            submitLabel="Guardar cambios"
            values={{
              id: p.id,
              contratoId: p.contratoId,
              tipo: p.tipo,
              aseguradora: p.aseguradora,
              valor: p.valor,
              vigenciaDesde: p.vigenciaDesde ? p.vigenciaDesde.toISOString() : null,
              vigenciaHasta: p.vigenciaHasta ? p.vigenciaHasta.toISOString() : null,
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
