import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarRubro, aprobarRubro, rechazarRubro } from "@/actions/rubros";
import { calcularEjecucionRubro, semaforoEjecucion } from "@/lib/presupuesto";
import RubroForm from "@/components/RubroForm";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "ok", Rechazado: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function RubroDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rubroId = Number(id);
  if (!rubroId) notFound();

  const r = await prisma.rubro.findUnique({
    where: { id: rubroId },
    include: { fuente: true, createdBy: true, aprobadoBy: true },
  });
  if (!r) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = r.estado !== "Aprobado";
  const puedeEditar = (await can(rol, "MOD-003", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-003", "aprobar")) && r.estado === "Registrado";
  const fuentes = await prisma.fuenteFinanciacion.findMany({ where: { estado: "Aprobada" }, orderBy: { codigo: "asc" } });
  const ej = await calcularEjecucionRubro(r.id, r.valorAsignado);

  const cuentas = await prisma.cuentaCobro.findMany({
    where: { rubroId: r.id, estado: { in: ["Aprobada", "Pagada"] } },
    include: { contrato: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{r.codigo}</h1>
          <p className="page-sub">
            MOD-003 · <span className={`badge ${ESTADO_BADGE[r.estado] ?? "off"}`}>{r.estado}</span> · {r.nombre} · {r.fuente.codigo}
          </p>
        </div>
        <Link href="/rubros" className="btn">← Volver</Link>
      </div>

      <div className="kpi-grid" style={{ marginTop: 18 }}>
        <div className="card kpi accent">
          <div className="lab">Asignado (meta)</div>
          <div className="val">{cop.format(ej.asignado)}</div>
          <div className="hint">vigencia {r.vigencia ?? "—"}</div>
        </div>
        <div className="card kpi">
          <div className="lab">Comprometido</div>
          <div className="val">{cop.format(ej.comprometido)}</div>
          <div className="hint">{ej.pctComprometido}% de la meta</div>
        </div>
        <div className="card kpi">
          <div className="lab">Ejecutado (pagado)</div>
          <div className="val">{cop.format(ej.ejecutado)}</div>
          <div className="hint">{ej.pctEjecutado}% de la meta</div>
        </div>
        <div className="card kpi">
          <div className="lab">Libre</div>
          <div className="val" style={{ color: ej.libre < 0 ? "var(--coral)" : undefined }}>{cop.format(ej.libre)}</div>
          <div className="hint">disponible para nuevas cuentas (RN-009)</div>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Fuente:</b> {r.fuente.codigo} — {r.fuente.nombre}</div>
          <div><b>Propuesto por:</b> {r.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {r.aprobadoBy ? `${r.aprobadoBy.nombre} · ${fmt(r.aprobadoEn)}` : "—"}</div>
        </div>
        {r.estado === "Rechazado" && r.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazado: {r.motivoRechazo}</div>
        )}
      </div>

      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación de la meta de inversión (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> puedes aprobar la meta de inversión propuesta por Financiera. No puedes
            aprobar un rubro que tú mismo propusiste, y la meta no puede superar el saldo libre de la fuente.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarRubro}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar meta de inversión</button>
            </form>
            <form action={rechazarRubro} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={r.id} />
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
          <p className="section-cap">Editar (vuelve a estado Registrado)</p>
          <RubroForm
            action={editarRubro}
            fuentes={fuentes}
            submitLabel="Guardar cambios"
            values={{ id: r.id, codigo: r.codigo, nombre: r.nombre, fuenteId: r.fuenteId, valorAsignado: r.valorAsignado, vigencia: r.vigencia }}
          />
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 18, maxWidth: 920 }}>
        <p className="section-cap">Cuentas de cobro comprometidas contra este rubro</p>
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Período</th>
              <th>Comprometido</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.length === 0 ? (
              <tr><td colSpan={4} className="empty">Ninguna cuenta de cobro compromete este rubro todavía.</td></tr>
            ) : (
              cuentas.map((c) => (
                <tr key={c.id}>
                  <td className="doc">{c.contrato.numero}</td>
                  <td>{c.periodo}</td>
                  <td className="mono">{cop.format(c.valorAprobado ?? c.valorCobrado)}</td>
                  <td><span className={`badge ${c.estado === "Pagada" ? "L" : "ok"}`}>{c.estado}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!puedeEditar && !puedeAprobar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Financiera (E) propone la meta de inversión y el
          Administrador (A) la aprueba — RN-025. {semaforoEjecucion(ej.pctEjecutado) === "L" ? "Aún hay margen amplio por ejecutar." : ""}
        </div>
      )}
    </div>
  );
}
