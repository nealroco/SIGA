import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NIVEL_ICONO } from "@/lib/iconos";
import { can, type Nivel } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PermisosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-028", "ver"))) redirect("/dashboard");

  const [roles, modulos, permisos] = await Promise.all([
    prisma.rol.findMany({ orderBy: { id: "asc" } }),
    prisma.modulo.findMany({ orderBy: { codigo: "asc" } }),
    prisma.permiso.findMany(),
  ]);

  const key = (rolId: number, moduloId: number) => `${rolId}:${moduloId}`;
  const nivelMap = new Map<string, string>();
  for (const p of permisos) nivelMap.set(key(p.rolId, p.moduloId), p.nivel);

  return (
    <div>
      <h1 className="page-title">Matriz de permisos</h1>
      <p className="page-sub">
        MOD-028 Seguridad / IAM · {roles.length} roles × {modulos.length} módulos. E=Escritura · A=Aprobación · L=Lectura · C=Carga · —=Sin acceso.
      </p>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#fbfcfe" }}>Módulo</th>
              {roles.map((r) => (
                <th key={r.id} title={r.descripcion ?? ""}>{r.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modulos.map((m) => (
              <tr key={m.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <span className="doc">{m.codigo}</span> {m.nombre}
                </td>
                {roles.map((r) => {
                  const nivel = (nivelMap.get(key(r.id, m.id)) ?? "NONE") as Nivel;
                  const NivelIcon = NIVEL_ICONO[nivel];
                  return (
                    <td key={r.id} className="matrix-cell">
                      <span className={`badge ${nivel}`}>
                        <NivelIcon />
                        {nivel === "NONE" ? "—" : nivel}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
