import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { cancelarReserva } from "@/actions/reservas";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Activa: "ok",
  Cancelada: "off",
  Emergencia: "A",
};

const fmt = (d: Date) =>
  new Date(d).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

export default async function ReservasPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-022", "crear") : false;
  const puedeCargar = session ? await can(session.user.rol, "MOD-022", "cargar") : false;
  const puedeEditar = session ? await can(session.user.rol, "MOD-022", "editar") : false;

  const items = await prisma.reservaEscenario.findMany({
    orderBy: { fechaInicio: "desc" },
    include: { escenario: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Reservas de escenario</h1>
          <p className="page-sub">MOD-022 · anti-solapamiento con margen de 30 min (RN-024) y override de emergencia (RN-024-B).</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/reservas/escenarios" className="btn">Escenarios</Link>
          {puedeCrear || puedeCargar ? (
            <Link href="/reservas/nuevo" className="btn btn-primary">+ Nueva reserva</Link>
          ) : (
            <span className="badge L" title="Crear reservas requiere escritura (E) o carga (C) en MOD-022">Sin registro</span>
          )}
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Escenario</th>
              <th>Tipo de uso</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay reservas.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.escenario.nombre}</td>
                  <td>{r.tipoUso ?? "—"}</td>
                  <td className="mono">{fmt(r.fechaInicio)}</td>
                  <td className="mono">{fmt(r.fechaFin)}</td>
                  <td><span className={`badge ${ESTADO_BADGE[r.estado] ?? "off"}`}>{r.estado}</span></td>
                  <td>
                    {puedeEditar && r.estado === "Activa" ? (
                      <form action={cancelarReserva}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="btn btn-sm" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
                          Cancelar
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} reserva(s).</p>
    </div>
  );
}
