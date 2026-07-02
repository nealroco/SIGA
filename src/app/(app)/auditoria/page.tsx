import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { cerrarHallazgo } from "@/actions/auditoria";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const GRAVEDAD_BADGE: Record<string, string> = { Alta: "C", Media: "A", Baja: "L" };
const ESTADO_BADGE: Record<string, string> = { Abierto: "A", Cerrado: "off" };

const fmt = (d: Date) =>
  new Date(d).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; accion?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-026", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(rol, "MOD-026", "crear");
  const puedeEditar = await can(rol, "MOD-026", "editar");

  const modulo = sp.modulo ?? "";
  const accion = sp.accion ?? "";

  const [totalEventos, totalHallazgosAbiertos, hallazgos, modulosDistintos, accionesDistintas] =
    await Promise.all([
      prisma.auditLog.count(),
      prisma.hallazgoAuditoria.count({ where: { estado: "Abierto" } }),
      prisma.hallazgoAuditoria.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { createdBy: true },
      }),
      prisma.auditLog.findMany({ select: { modulo: true }, distinct: ["modulo"], orderBy: { modulo: "asc" } }),
      prisma.auditLog.findMany({ select: { accion: true }, distinct: ["accion"], orderBy: { accion: "asc" } }),
    ]);

  const where: Prisma.AuditLogWhereInput = {};
  if (modulo) where.modulo = modulo;
  if (accion) where.accion = accion;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { fechaHora: "desc" },
    take: 100,
    include: { usuario: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Auditoría interna</h1>
          <p className="page-sub">MOD-026 · visor de bitácora automática y hallazgos de auditoría interna (Supervisor/Revisor registran).</p>
        </div>
        {puedeCrear ? (
          <Link href="/auditoria/nuevo" className="btn btn-primary">+ Nuevo hallazgo</Link>
        ) : (
          <span className="badge L" title="Registrar hallazgos requiere escritura (E) en MOD-026 — roles Supervisor/Revisor">Solo lectura</span>
        )}
      </div>

      <div className="kpi-grid" style={{ marginTop: 18 }}>
        <div className="card kpi accent">
          <div className="lab">Eventos de auditoría</div>
          <div className="val">{totalEventos}</div>
          <div className="hint">Total de registros en la bitácora (AuditLog)</div>
        </div>
        <div className="card kpi">
          <div className="lab">Hallazgos abiertos</div>
          <div className="val">{totalHallazgosAbiertos}</div>
          <div className="hint">Pendientes de cierre</div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Hallazgos de auditoría interna</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>Gravedad</th>
                <th>Estado</th>
                <th>Registrado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {hallazgos.length === 0 ? (
                <tr><td colSpan={6} className="empty">No hay hallazgos registrados.</td></tr>
              ) : (
                hallazgos.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{h.modulo ?? "—"}</td>
                    <td>{h.descripcion}</td>
                    <td><span className={`badge ${GRAVEDAD_BADGE[h.gravedad] ?? "off"}`}>{h.gravedad}</span></td>
                    <td><span className={`badge ${ESTADO_BADGE[h.estado] ?? "off"}`}>{h.estado}</span></td>
                    <td>{h.createdBy?.nombre ?? "—"}</td>
                    <td>
                      {h.estado === "Abierto" && puedeEditar ? (
                        <form action={cerrarHallazgo}>
                          <input type="hidden" name="id" value={h.id} />
                          <button className="btn btn-sm" type="submit">Cerrar</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="page-sub" style={{ marginTop: 12 }}>{hallazgos.length} hallazgo(s).</p>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Bitácora de auditoría (últimos 100 eventos)</p>
        <form className="toolbar" method="get">
          <select className="select" name="modulo" defaultValue={modulo} style={{ width: 200 }}>
            <option value="">Todos los módulos</option>
            {modulosDistintos.map((m) => (
              <option key={m.modulo} value={m.modulo}>{m.modulo}</option>
            ))}
          </select>
          <select className="select" name="accion" defaultValue={accion} style={{ width: 200 }}>
            <option value="">Todas las acciones</option>
            {accionesDistintas.map((a) => (
              <option key={a.accion} value={a.accion}>{a.accion}</option>
            ))}
          </select>
          <button className="btn btn-blue" type="submit">Filtrar</button>
          {(modulo || accion) && <Link href="/auditoria" className="btn">Limpiar</Link>}
        </form>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="empty">No hay eventos de auditoría.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{fmt(l.fechaHora)}</td>
                    <td>{l.usuario?.nombre ?? "Sistema"}</td>
                    <td>{l.accion}</td>
                    <td className="mono">{l.modulo}</td>
                    <td className="mono">{l.registroId ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="page-sub" style={{ marginTop: 12 }}>Mostrando hasta 100 eventos más recientes (de {totalEventos} en total).</p>
      </div>
    </div>
  );
}
