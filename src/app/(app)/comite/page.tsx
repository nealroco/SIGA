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

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CO");

export default async function ComitePage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-015", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-015", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.ActaComiteWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada"].includes(estado)) where.estado = estado;

  const items = await prisma.actaComite.findMany({
    where,
    orderBy: { fecha: "desc" },
    take: 200,
    select: {
      id: true,
      fecha: true,
      tema: true,
      estado: true,
      createdBy: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Comité de control</h1>
          <p className="page-sub">MOD-015 · actas del comité. Doble aprobación RN-025 (Supervisor/Coord. deportiva registran · Administrador aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/comite/nuevo" className="btn btn-primary">+ Nueva acta</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-015 — rol Supervisor o Coord. deportiva">Sin registro</span>
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
        {estado && <Link href="/comite" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tema</th>
              <th>Registrada por</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay actas.</td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{fmt(a.fecha)}</td>
                  <td>{a.tema}</td>
                  <td>{a.createdBy?.nombre ?? "—"}</td>
                  <td><span className={`badge ${ESTADO_BADGE[a.estado] ?? "off"}`}>{a.estado}</span></td>
                  <td><Link href={`/comite/${a.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} acta(s).</p>
    </div>
  );
}
