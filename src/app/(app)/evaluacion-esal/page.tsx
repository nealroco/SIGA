import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Registrada: "A",
  Aprobada: "ok",
  Rechazada: "C",
};

export default async function EvaluacionEsalPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-009", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-009", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.EvaluacionEsalWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada"].includes(estado)) where.estado = estado;

  const items = await prisma.evaluacionEsal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      criterio: true,
      puntaje: true,
      estado: true,
      tercero: { select: { razonSocial: true } },
      convocatoria: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Evaluación ESAL</h1>
          <p className="page-sub">MOD-009 · doble control (Administrador registra · Supervisor aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/evaluacion-esal/nuevo" className="btn btn-primary">+ Nueva evaluación</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-009 — rol Administrador">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrada">Registrada</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/evaluacion-esal" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tercero</th>
              <th>Convocatoria</th>
              <th>Criterio</th>
              <th>Puntaje</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay evaluaciones.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td>{e.tercero.razonSocial}</td>
                  <td>{e.convocatoria?.nombre ?? "—"}</td>
                  <td>{e.criterio ?? "—"}</td>
                  <td className="mono">{e.puntaje != null ? e.puntaje : "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span></td>
                  <td><Link href={`/evaluacion-esal/${e.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} evaluación(es).</p>
    </div>
  );
}
