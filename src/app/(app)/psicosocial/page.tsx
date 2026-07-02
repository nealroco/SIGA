import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Registrada: "A",
  Revisada: "ok",
};

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function PsicosocialPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-018", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-018", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.EvaluacionPsicosocialWhereInput = {};
  if (["Registrada", "Revisada"].includes(estado)) where.estado = estado;

  const items = await prisma.evaluacionPsicosocial.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      fecha: true,
      instrumento: true,
      resultado: true,
      estado: true,
      beneficiario: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Evaluación psicosocial</h1>
          <p className="page-sub">MOD-018 · registro y revisión de evaluaciones psicosociales de beneficiarios.</p>
        </div>
        {puedeCrear ? (
          <Link href="/psicosocial/nuevo" className="btn btn-primary">+ Nueva evaluación</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-018">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrada">Registrada</option>
          <option value="Revisada">Revisada</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/psicosocial" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Beneficiario</th>
              <th>Fecha</th>
              <th>Instrumento</th>
              <th>Resultado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay evaluaciones psicosociales registradas.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id}>
                  <td>{e.beneficiario.nombre}</td>
                  <td className="mono">{fmt(e.fecha)}</td>
                  <td>{e.instrumento ?? "—"}</td>
                  <td>{e.resultado ?? "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span></td>
                  <td><Link href={`/psicosocial/${e.id}`} className="btn btn-sm">Abrir</Link></td>
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
