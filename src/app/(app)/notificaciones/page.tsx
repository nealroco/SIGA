import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearNotificacion, marcarEstadoEnvio } from "@/actions/notificaciones";
import NotificacionForm from "@/components/NotificacionForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Enviada: "ok",
  Fallida: "C",
  Pendiente: "A",
};

function truncar(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default async function NotificacionesPage() {
  const session = await auth();
  const rol = session?.user.rol ?? "";
  const puedeCrear = session ? await can(rol, "MOD-021", "crear") : false;
  const puedeEditar = session ? await can(rol, "MOD-021", "editar") : false;

  const items = await prisma.notificacion.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <div>
        <h1 className="page-title">Notificaciones</h1>
        <p className="page-sub">MOD-021 · cola de avisos del sistema (eventos RN-024-B, RN-025, RN-026 y notificaciones manuales).</p>
      </div>

      {puedeCrear ? (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Nueva notificación</p>
          <NotificacionForm action={crearNotificacion} submitLabel="Registrar notificación" />
        </div>
      ) : (
        <div className="alert info" style={{ marginTop: 18 }}>
          Registrar notificaciones requiere <b>escritura (E)</b> en MOD-021 (roles <b>Administrador</b> y <b>Tecnología</b>). Tu rol (<b>{rol}</b>) tiene acceso de solo lectura.
        </div>
      )}

      <p className="section-cap" style={{ marginTop: 24 }}>Historial</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tipo de evento</th>
              <th>Destinatario</th>
              <th>Mensaje</th>
              <th>Canal</th>
              <th>Estado</th>
              {puedeEditar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={puedeEditar ? 6 : 5} className="empty">No hay notificaciones registradas.</td></tr>
            ) : (
              items.map((n) => (
                <tr key={n.id}>
                  <td className="mono">{n.tipoEvento}</td>
                  <td>{n.destinatario ?? "—"}</td>
                  <td>{truncar(n.mensaje, 80)}</td>
                  <td>{n.canal}</td>
                  <td><span className={`badge ${ESTADO_BADGE[n.estadoEnvio] ?? "off"}`}>{n.estadoEnvio}</span></td>
                  {puedeEditar && (
                    <td>
                      {n.estadoEnvio === "Pendiente" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <form action={marcarEstadoEnvio}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="estado" value="Enviada" />
                            <button className="btn btn-sm btn-blue" type="submit">Marcar enviada</button>
                          </form>
                          <form action={marcarEstadoEnvio}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="estado" value="Fallida" />
                            <button className="btn btn-sm" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Marcar fallida</button>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} notificación(es).</p>
    </div>
  );
}
