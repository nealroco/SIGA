import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { aprobarRegistroSecop, rechazarRegistroSecop, sincronizarRegistroSecop } from "@/actions/secop";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "L", Rechazado: "C", Sincronizado: "ok" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function RegistroSecopDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const registroId = Number(id);
  if (!registroId) notFound();

  const r = await prisma.registroSecop.findUnique({
    where: { id: registroId },
    include: { contrato: true, createdBy: true, aprobadoBy: true },
  });
  if (!r) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeAprobar = (await can(rol, "MOD-027", "aprobar")) && r.estadoSync === "Registrado";
  const puedeSincronizar = (await can(rol, "MOD-027", "editar")) && r.estadoSync === "Aprobado";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{r.procesoSecop}</h1>
          <p className="page-sub">
            MOD-027 · <span className={`badge ${ESTADO_BADGE[r.estadoSync] ?? "off"}`}>{r.estadoSync}</span> · {r.contrato.numero}
          </p>
        </div>
        <Link href="/secop" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Contrato:</b> {r.contrato.numero}</div>
          <div><b>Objeto:</b> {r.contrato.objeto}</div>
          <div><b>Proceso SECOP:</b> <span className="mono">{r.procesoSecop}</span></div>
          <div><b>Registrado por:</b> {r.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {r.aprobadoBy ? `${r.aprobadoBy.nombre} · ${fmt(r.aprobadoEn)}` : "—"}</div>
        </div>
        {r.estadoSync === "Rechazado" && r.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 14 }}>Rechazado: {r.motivoRechazo}</div>
        )}
      </div>

      {/* RN-025: panel de aprobación (solo nivel A — Administrador) */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> (nivel Aprobación) puedes dar firmeza al registro hecho por Financiera. No puedes aprobar lo que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarRegistroSecop}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar registro</button>
            </form>
            <form action={rechazarRegistroSecop} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
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

      {puedeSincronizar && (
        <form action={sincronizarRegistroSecop} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={r.id} />
          <div>
            <b>Sincronizar con SECOP II</b>
            <div className="page-sub">Simula el envío del registro aprobado a la plataforma SECOP II (sin llamada externa real).</div>
          </div>
          <button className="btn btn-primary" type="submit">Sincronizar con SECOP II</button>
        </form>
      )}

      {!puedeAprobar && !puedeSincronizar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro lo hace Financiera (E) y la aprobación el Administrador (A) — RN-025.
        </div>
      )}
    </div>
  );
}
