import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPermisos, puede } from "@/lib/permissions";
import { editarPersonal, darDeBajaPersonal, aprobarPersonal, rechazarPersonal } from "@/actions/personal";
import PersonalForm from "@/components/PersonalForm";

export const dynamic = "force-dynamic";

export default async function PersonalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  const permisos = await getPermisos(rol);
  const nivel = permisos.get("MOD-002");
  if (!puede(nivel, "ver")) redirect("/personal");

  const { id } = await params;
  const personalId = Number(id);
  if (!personalId) notFound();

  const p = await prisma.personal.findUnique({
    where: { id: personalId },
    select: {
      id: true,
      documento: true,
      nombre: true,
      cargo: true,
      perfil: true,
      tipoVinculacion: true,
      fechaIngreso: true,
      correo: true,
      telefono: true,
      estado: true,
      estadoAprobacion: true,
      motivoRechazo: true,
      aprobadoEn: true,
      createdBy: { select: { id: true, nombre: true } },
      aprobadoBy: { select: { id: true, nombre: true } },
    },
  });
  if (!p) notFound();

  const editable = p.estadoAprobacion !== "Aprobado" && p.estado !== "Inactivo";
  const puedeEditar = puede(nivel, "editar") && editable;
  const puedeBaja = puede(nivel, "eliminar");
  const puedeAprobar = puede(nivel, "aprobar") && p.estadoAprobacion === "Pendiente";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{p.nombre}</h1>
          <p className="page-sub">
            MOD-002 · <span className="mono">{p.documento}</span> ·{" "}
            <span className={`badge ${p.estado === "Activo" ? "ok" : "off"}`}>{p.estado}</span> ·{" "}
            <span className={`badge ${p.estadoAprobacion === "Aprobado" ? "ok" : p.estadoAprobacion === "Rechazado" ? "C" : "A"}`}>{p.estadoAprobacion}</span>
          </p>
        </div>
        <Link href="/personal" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 18, maxWidth: 720 }}>
        <p className="section-cap">Trazabilidad</p>
        <div className="form-grid" style={{ gap: "8px 18px" }}>
          <div><b>Registrado por:</b> {p.createdBy?.nombre ?? "—"}</div>
          <div><b>Aprobado por:</b> {p.aprobadoBy ? `${p.aprobadoBy.nombre} · ${p.aprobadoEn?.toLocaleDateString("es-CO")}` : "—"}</div>
        </div>
        {p.estadoAprobacion === "Rechazado" && p.motivoRechazo && (
          <div className="alert error" style={{ marginTop: 12 }}>Rechazado: {p.motivoRechazo}</div>
        )}
      </div>

      {/* RN-025: panel de aprobación (Supervisor=A), self-block contra quien registró */}
      {puedeAprobar && (
        <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 720, borderColor: "var(--blue)" }}>
          <p className="section-cap">Aprobación (RN-025 · doble control)</p>
          <p className="page-sub" style={{ marginBottom: 14 }}>
            Como <b>{rol}</b> puedes dar firmeza a esta vinculación. No puedes aprobar lo que tú mismo registraste.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={aprobarPersonal}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-blue" type="submit">✓ Aprobar vinculación</button>
            </form>
            <form action={rechazarPersonal} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={p.id} />
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="motivo">Motivo de rechazo</label>
                <input id="motivo" name="motivo" className="input" placeholder="Motivo…" style={{ width: 240 }} required />
              </div>
              <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Rechazar</button>
            </form>
          </div>
        </div>
      )}

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          {editable ? (
            <>Tu rol (<b>{rol}</b>) tiene <b>solo lectura</b> en MOD-002. Consulta sin edición (RN-015).</>
          ) : p.estado === "Inactivo" ? (
            <>Registro dado de <b>baja</b> (Inactivo) — no puede editarse.</>
          ) : (
            <>Vinculación ya <b>aprobada</b> — no puede editarse.</>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <PersonalForm
            action={editarPersonal}
            submitLabel="Guardar cambios"
            values={{
              id: p.id,
              documento: p.documento,
              nombre: p.nombre,
              cargo: p.cargo,
              perfil: p.perfil,
              tipoVinculacion: p.tipoVinculacion,
              fechaIngreso: p.fechaIngreso ? p.fechaIngreso.toISOString() : null,
              correo: p.correo,
              telefono: p.telefono,
            }}
          />
        </div>
      )}

      {puedeBaja && p.estado === "Activo" && (
        <form action={darDeBajaPersonal} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={p.id} />
          <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>Dar de baja</b>
              <div className="page-sub">Baja lógica: pasa a Inactivo, nunca se elimina el histórico (RN-002).</div>
            </div>
            <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
              Dar de baja
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
