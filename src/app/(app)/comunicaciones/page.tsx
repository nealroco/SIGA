import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Borrador: "A",
  Enviada: "ok",
};

export default async function ComunicacionesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-019", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-019", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.ComunicacionWhereInput = {};
  if (["Borrador", "Enviada"].includes(estado)) where.estado = estado;

  const items = await prisma.comunicacion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      asunto: true,
      tipo: true,
      canal: true,
      publico: true,
      estado: true,
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Comunicaciones</h1>
          <p className="page-sub">MOD-019 · comunicaciones internas, externas y de prensa. Sin nivel de aprobación.</p>
        </div>
        {puedeCrear ? (
          <Link href="/comunicaciones/nuevo" className="btn btn-primary">+ Nueva comunicación</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-019">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Enviada">Enviada</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/comunicaciones" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Asunto</th>
              <th>Tipo</th>
              <th>Canal</th>
              <th>Público</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay comunicaciones.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td className="doc">{c.asunto}</td>
                  <td>{c.tipo}</td>
                  <td>{c.canal ?? "—"}</td>
                  <td>{c.publico ?? "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span></td>
                  <td><Link href={`/comunicaciones/${c.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} comunicación(es).</p>
    </div>
  );
}
