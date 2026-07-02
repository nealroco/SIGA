import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { cambiarEstadoUsuario, registrarAccesoEmergencia } from "@/actions/iam";
import AccesoEmergenciaForm from "@/components/AccesoEmergenciaForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Activo: "ok",
  Inactivo: "off",
  Bloqueado: "C",
};

const ESTADOS = ["Activo", "Inactivo", "Bloqueado"] as const;

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("es-CO") : "—");

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-028", "ver"))) redirect("/dashboard");
  const puedeEditar = await can(rol, "MOD-028", "editar");

  const [usuarios, accesos] = await Promise.all([
    prisma.usuario.findMany({ orderBy: { nombre: "asc" }, include: { rol: true } }),
    prisma.accesoEmergenciaIAM.findMany({ orderBy: { createdAt: "desc" }, include: { usuario: true } }),
  ]);

  return (
    <div>
      <h1 className="page-title">Usuarios</h1>
      <p className="page-sub">
        MOD-028 Seguridad / IAM · gestión de usuarios y acceso de emergencia. Ver también la{" "}
        <Link href="/admin/permisos" className="mono" style={{ color: "var(--blue)" }}>matriz de permisos →</Link>
      </p>

      {rol === "Administrador" ? (
        <AccesoEmergenciaForm action={registrarAccesoEmergencia} />
      ) : (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Solo el rol Administrador puede registrar acceso de emergencia (RN-026).
        </div>
      )}

      <p className="section-cap" style={{ marginTop: 28 }}>Usuarios registrados</p>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              {puedeEditar && <th></th>}
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan={puedeEditar ? 6 : 5} className="empty">No hay usuarios.</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td className="mono">{u.correo}</td>
                  <td>{u.rol.nombre}</td>
                  <td><span className={`badge ${ESTADO_BADGE[u.estado] ?? "off"}`}>{u.estado}</span></td>
                  <td>{fmt(u.ultimoAcceso)}</td>
                  {puedeEditar && (
                    <td>
                      <form action={cambiarEstadoUsuario} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="usuarioId" value={u.id} />
                        <select name="nuevoEstado" className="select" defaultValue={u.estado} style={{ width: 130 }}>
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                        <button className="btn btn-sm" type="submit">Aplicar</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{usuarios.length} usuario(s).</p>

      <p className="section-cap" style={{ marginTop: 28 }}>Histórico de acceso de emergencia (RN-026)</p>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Motivo</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {accesos.length === 0 ? (
              <tr><td colSpan={3} className="empty">No hay accesos de emergencia registrados.</td></tr>
            ) : (
              accesos.map((a) => (
                <tr key={a.id}>
                  <td>{a.usuario?.nombre ?? "—"}</td>
                  <td>{a.motivo}</td>
                  <td>{fmt(a.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{accesos.length} acceso(s) de emergencia registrado(s).</p>
    </div>
  );
}
