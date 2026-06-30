import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarCuenta, aprobarCuenta, rechazarCuenta, aprobarPago, rechazarPago } from "@/actions/financiera";
import CuentaForm from "@/components/CuentaForm";
import PagoForm from "@/components/PagoForm";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Registrada: "A", Aprobada: "ok", Rechazada: "C", Pagada: "L" };
const PAGO_BADGE: Record<string, string> = { Ordenado: "A", Aprobado: "ok", Rechazado: "C" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function CuentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cuentaId = Number(id);
  if (!cuentaId) notFound();

  const c = await prisma.cuentaCobro.findUnique({
    where: { id: cuentaId },
    include: {
      contrato: true,
      rubro: { include: { fuente: true } },
      createdBy: true,
      aprobadoBy: true,
      pagos: { orderBy: { fechaPago: "desc" }, include: { createdBy: true, aprobadoBy: true } },
    },
  });
  if (!c) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const editable = c.estado === "Registrada" || c.estado === "Rechazada";
  const puedeEditar = (await can(rol, "MOD-003", "editar")) && editable;
  const puedeAprobar = (await can(rol, "MOD-003", "aprobar")) && c.estado === "Registrada";
  const puedeAprobarPago = await can(rol, "MOD-003", "aprobar");
  const puedeCrearPago = (await can(rol, "MOD-003", "crear")) && c.estado === "Aprobada";

  const [contratos, rubros, pagosRubro] = await Promise.all([
    prisma.contrato.findMany({ orderBy: { numero: "asc" } }),
    prisma.rubro.findMany({ orderBy: { codigo: "asc" } }),
    prisma.pago.findMany({ where: { cuentaCobro: { rubroId: c.rubroId }, estado: "Aprobado" } }),
  ]);
  // Solo las órdenes de pago Aprobadas cuentan como ejecutadas (no es una transacción en línea: las
  // Ordenadas siguen pendientes de aprobación y las Rechazadas nunca se ejecutan).
  const sumaPagosRubro = pagosRubro.reduce((acc, p) => acc + p.valorPagado, 0);
  const saldoRubro = c.rubro.valorAsignado - sumaPagosRubro;
  const totalPagado = c.pagos.filter((p) => p.estado === "Aprobado").reduce((acc, p) => acc + p.valorPagado, 0);
  const saldoCausado = (c.valorAprobado ?? 0) - totalPagado;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Cuenta de cobro #{c.id}</h1>
          <p className="page-sub">
            MOD-003 · <span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span> · {c.contrato.numero} · {c.periodo}
          </p>
        </div>
        <Link href="/financiera" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Contrato:</b> {c.contrato.numero} — {c.contrato.objeto}</div>
          <div><b>Rubro:</b> {c.rubro.codigo} · {c.rubro.nombre} ({c.rubro.fuente.nombre})</div>
          <div><b>Período:</b> {c.periodo}</div>
          <div><b>Informe:</b> {c.informeId ?? "— (sin informe asociado)"}</div>
          <div><b>Valor cobrado:</b> <span className="mono">{cop.format(c.valorCobrado)}</span></div>
          <div><b>Valor aprobado:</b> <span className="mono">{c.valorAprobado != null ? cop.format(c.valorAprobado) : "—"}</span></div>
          <div><b>Total pagado:</b> <span className="mono">{cop.format(totalPagado)}</span></div>
          <div><b>Saldo causado:</b> <span className="mono">{cop.format(saldoCausado)}</span></div>
          <div><b>Saldo restante del rubro:</b> <span className="mono">{cop.format(saldoRubro)}</span></div>
          <div><b>Registrado por:</b> {c.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {c.aprobadoBy ? `${c.aprobadoBy.nombre} · ${fmt(c.aprobadoEn)}` : "—"}</div>
        </div>
        {c.estado === "Rechazada" && c.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazada: {c.motivoRechazo}</div>
        )}
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza a la cuenta registrada por Financiera. No puedes aprobar una
            cuenta que tú mismo registraste. RN-018: si el contrato tiene una póliza Aprobada vencida, no podrá aprobarse.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarCuenta}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar cuenta</button>
            </form>
            <form action={rechazarCuenta} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
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

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar (vuelve a estado Registrada)</p>
          <CuentaForm
            action={editarCuenta}
            contratos={contratos}
            rubros={rubros}
            submitLabel="Guardar cambios"
            values={{
              id: c.id,
              contratoId: c.contratoId,
              rubroId: c.rubroId,
              periodo: c.periodo,
              valorCobrado: c.valorCobrado,
              informeId: c.informeId,
            }}
          />
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 18, maxWidth: 920 }}>
        <p className="section-cap">Órdenes de pago (RN-025 · no son transacciones en línea)</p>
        <table className="data">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Valor</th>
              <th>Comprobante</th>
              <th>Medio</th>
              <th>Estado</th>
              <th>Ordenado por</th>
              <th>Aprobado por</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {c.pagos.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay órdenes de pago.</td></tr>
            ) : (
              c.pagos.map((p) => (
                <tr key={p.id}>
                  <td>{fmt(p.fechaPago)}</td>
                  <td className="mono">{cop.format(p.valorPagado)}</td>
                  <td className="doc">{p.comprobante ?? "—"}</td>
                  <td>{p.medioPago ?? "—"}</td>
                  <td><span className={`badge ${PAGO_BADGE[p.estado] ?? "off"}`}>{p.estado}</span></td>
                  <td>{p.createdBy?.nombre ?? "—"}</td>
                  <td>{p.aprobadoBy?.nombre ?? "—"}</td>
                  <td>
                    {puedeAprobarPago && p.estado === "Ordenado" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <form action={aprobarPago}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn-sm btn-blue" type="submit">Aprobar</button>
                        </form>
                        <form action={rechazarPago}>
                          <input type="hidden" name="id" value={p.id} />
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

      {puedeCrearPago && <PagoForm cuentaCobroId={c.id} />}

      {!puedeEditar && !puedeAprobar && !puedeCrearPago && !puedeAprobarPago && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Financiera (E) registra la cuenta y ordena el
          pago; el Administrador (A) aprueba ambos pasos — RN-025. Ninguno se ejecuta como transacción en
          línea.
        </div>
      )}
    </div>
  );
}
