import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarSeguimiento, aprobarSeguimiento, rechazarSeguimiento, cerrarSeguimiento } from "@/actions/seguimiento";
import SeguimientoForm from "@/components/SeguimientoForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "ok", Rechazado: "C", Cerrado: "off" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function SeguimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seguimientoId = Number(id);
  if (!seguimientoId) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-011", "ver"))) redirect("/dashboard");

  const s = await prisma.seguimiento.findUnique({
    where: { id: seguimientoId },
    select: {
      id: true,
      beneficiarioId: true,
      programa: true,
      fecha: true,
      actividad: true,
      observacion: true,
      estado: true,
      createdById: true,
      beneficiario: { select: { nombre: true, documento: true } },
      createdBy: { select: { nombre: true } },
    },
  });
  if (!s) notFound();

  const puedeEditar = (await can(rol, "MOD-011", "editar")) && (s.estado === "Registrado" || s.estado === "Rechazado");
  const esRegistrador = s.createdById != null && s.createdById === Number(session.user.id);
  // RN-025: MOD-011 no tiene nivel de Aprobación (A); la revisión exige escritura (E)
  // pero nunca puede ejecutarla quien registró el seguimiento.
  const puedeRevisar = (await can(rol, "MOD-011", "editar")) && s.estado === "Registrado" && !esRegistrador;
  const puedeCerrar = (await can(rol, "MOD-011", "editar")) && s.estado === "Aprobado";
  const beneficiarios = await prisma.beneficiario.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, documento: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{s.actividad}</h1>
          <p className="page-sub">
            MOD-011 · <span className={`badge ${ESTADO_BADGE[s.estado] ?? "off"}`}>{s.estado}</span> · {s.beneficiario.nombre}
          </p>
        </div>
        <Link href="/seguimiento" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Beneficiario:</b> {s.beneficiario.nombre} (<span className="mono">{s.beneficiario.documento}</span>)</div>
          <div><b>Programa:</b> {s.programa ?? "—"}</div>
          <div><b>Fecha:</b> {fmt(s.fecha)}</div>
          <div><b>Actividad:</b> {s.actividad}</div>
          <div><b>Observación:</b> {s.observacion ?? "—"}</div>
          <div><b>Registrado por:</b> {s.createdBy?.nombre ?? "—"}</div>
        </div>
      </div>

      {puedeRevisar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760, borderColor: "var(--blue)" }}>
          <p className="section-cap">Revisión (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> puedes aprobar o rechazar este seguimiento. No puedes revisar uno que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarSeguimiento}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar</button>
            </form>
            <form action={rechazarSeguimiento} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={s.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="motivo">Motivo de rechazo</label>
                <input id="motivo" name="motivo" className="input" placeholder="Motivo…" style={{ width: 240 }} required />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
            </form>
          </div>
        </div>
      )}

      {puedeCerrar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
          <p className="section-cap">Cierre</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>Este seguimiento está Aprobado y puede cerrarse.</p>
          <form action={cerrarSeguimiento}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn" type="submit">Cerrar seguimiento</button>
          </form>
        </div>
      )}

      {puedeEditar ? (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <SeguimientoForm
            action={editarSeguimiento}
            beneficiarios={beneficiarios}
            submitLabel="Guardar cambios"
            values={{
              id: s.id,
              beneficiarioId: s.beneficiarioId,
              programa: s.programa,
              fecha: s.fecha ? s.fecha.toISOString() : null,
              actividad: s.actividad,
              observacion: s.observacion,
            }}
          />
        </div>
      ) : !puedeRevisar && !puedeCerrar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Editar seguimientos requiere escritura (E) en MOD-011 (RN-015).
        </div>
      ) : null}
    </div>
  );
}
