import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Registrado: "A",
  Aprobado: "ok",
  Rechazado: "C",
  Cerrado: "off",
};

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function SeguimientoPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-011", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-011", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.SeguimientoWhereInput = {};
  if (["Registrado", "Aprobado", "Rechazado", "Cerrado"].includes(estado)) where.estado = estado;

  const items = await prisma.seguimiento.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { beneficiario: true },
    take: 200,
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Seguimiento</h1>
          <p className="page-sub">MOD-011 · registro de actividades y seguimiento de beneficiarios.</p>
        </div>
        {puedeCrear ? (
          <Link href="/seguimiento/nuevo" className="btn btn-primary">+ Nuevo seguimiento</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-011">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrado">Registrado</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
          <option value="Cerrado">Cerrado</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/seguimiento" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Beneficiario</th>
              <th>Fecha</th>
              <th>Actividad</th>
              <th>Programa</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay seguimientos registrados.</td></tr>
            ) : (
              items.map((s) => (
                <tr key={s.id}>
                  <td>{s.beneficiario.nombre}</td>
                  <td className="mono">{fmt(s.fecha)}</td>
                  <td>{s.actividad}</td>
                  <td>{s.programa ?? "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[s.estado] ?? "off"}`}>{s.estado}</span></td>
                  <td><Link href={`/seguimiento/${s.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} seguimiento(s).</p>
    </div>
  );
}
