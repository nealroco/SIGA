import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import ConfigCloudRow from "@/components/ConfigCloudRow";

export const dynamic = "force-dynamic";

export default async function InfraestructuraCloudPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-029", "ver"))) redirect("/dashboard");
  const puedeEditar = await can(rol, "MOD-029", "editar");

  const [usuariosActivos, totalModulos, totalDocumentos, totalAuditoria, configuraciones] = await Promise.all([
    prisma.usuario.count({ where: { estado: "Activo" } }),
    prisma.modulo.count(),
    prisma.documento.count(),
    prisma.auditLog.count(),
    prisma.configuracionCloud.findMany({
      orderBy: { clave: "asc" },
      select: {
        clave: true,
        valor: true,
        descripcion: true,
        updatedAt: true,
        actualizadoBy: { select: { nombre: true } },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="page-title">Infraestructura cloud</h1>
      <p className="page-sub">
        MOD-029 · estado del sistema y configuración cloud. {puedeEditar ? "Edición disponible para tu rol (E)." : "Vista de solo lectura para tu rol (L)."}
      </p>

      <p className="section-cap" style={{ marginTop: 18 }}>Estado del sistema</p>
      <div className="kpi-grid">
        <div className="card kpi accent">
          <div className="lab">Usuarios activos</div>
          <div className="val">{usuariosActivos}</div>
          <div className="hint">cuentas en estado Activo</div>
        </div>
        <div className="card kpi">
          <div className="lab">Módulos</div>
          <div className="val">{totalModulos}</div>
          <div className="hint">total registrados en la plataforma</div>
        </div>
        <div className="card kpi">
          <div className="lab">Documentos</div>
          <div className="val">{totalDocumentos}</div>
          <div className="hint">expediente documental (MOD-005)</div>
        </div>
        <div className="card kpi">
          <div className="lab">Bitácora de auditoría</div>
          <div className="val">{totalAuditoria}</div>
          <div className="hint">registros en AuditLog (RN-014)</div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-cap">Configuración cloud</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Clave</th>
                <th>Valor</th>
                <th>Descripción</th>
                <th>Actualizado por</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {configuraciones.length === 0 ? (
                <tr><td colSpan={5} className="empty">No hay parámetros de configuración cloud.</td></tr>
              ) : puedeEditar ? (
                configuraciones.map((c) => (
                  <ConfigCloudRow
                    key={c.clave}
                    clave={c.clave}
                    valor={c.valor}
                    descripcion={c.descripcion}
                    actualizadoPor={c.actualizadoBy?.nombre ?? "—"}
                    updatedAt={new Date(c.updatedAt).toLocaleString("es-CO")}
                  />
                ))
              ) : (
                configuraciones.map((c) => (
                  <tr key={c.clave}>
                    <td className="mono">{c.clave}</td>
                    <td>{c.valor}</td>
                    <td>{c.descripcion ?? "—"}</td>
                    <td>{c.actualizadoBy?.nombre ?? "—"}</td>
                    <td className="mono">{new Date(c.updatedAt).toLocaleString("es-CO")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!puedeEditar && (
          <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
            Editar la configuración cloud requiere <b>escritura (E)</b> en MOD-029 (roles <b>Administrador</b> / <b>Tecnología</b>). Tu rol (<b>{rol}</b>) tiene solo lectura (RN-015).
          </div>
        )}
      </div>
    </div>
  );
}
