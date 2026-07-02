import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Radicado: "A",
  Aprobado: "ok",
  Devuelto: "C",
  "Con observaciones": "C",
};

export default async function InformesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-006", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-006", "editar");

  const sp = await searchParams;
  const estado = sp.estado ?? "";
  const where: Prisma.InformeWhereInput = {};
  if (["Radicado", "Aprobado", "Devuelto", "Con observaciones"].includes(estado)) where.estado = estado;

  const items = await prisma.informe.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { contrato: true },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Informes</h1>
          <p className="page-sub">MOD-006 · radicación y aprobación de informes por contrato y periodo (RN-022/RN-023/RN-026).</p>
        </div>
        {puedeCrear ? (
          <Link href="/informes/nuevo" className="btn btn-primary">+ Radicar informe</Link>
        ) : (
          <span className="badge L" title="Radicar requiere escritura (E) en MOD-006">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 220 }}>
          <option value="">Todos los estados</option>
          <option value="Radicado">Radicado</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Devuelto">Devuelto</option>
          <option value="Con observaciones">Con observaciones</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/informes" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Certificado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay informes.</td></tr>
            ) : (
              items.map((i) => (
                <tr key={i.id}>
                  <td className="doc">{i.contrato.numero}</td>
                  <td className="mono">{i.periodo}</td>
                  <td><span className={`badge ${ESTADO_BADGE[i.estado] ?? "off"}`}>{i.estado}</span></td>
                  <td><span className={`badge ${i.certificadoGenerado ? "ok" : "off"}`}>{i.certificadoGenerado ? "Sí" : "No"}</span></td>
                  <td><Link href={`/informes/${i.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} informe(s).</p>
    </div>
  );
}
