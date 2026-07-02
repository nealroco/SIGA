import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Abierta: "ok",
  "En selección": "A",
  Adjudicada: "L",
  Cerrada: "off",
  Borrador: "off",
};

export default async function ConvocatoriasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-008", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-008", "crear");

  const items = await prisma.convocatoria.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { selecciones: true } }, selecciones: { where: { estado: "Aprobado" } } },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Convocatorias</h1>
          <p className="page-sub">MOD-008 · selección con segregación RN-027 (Supervisor selecciona · Administrador aprueba; la Coord. deportiva no selecciona).</p>
        </div>
        {puedeCrear ? (
          <Link href="/convocatorias/nuevo" className="btn btn-primary">+ Nueva convocatoria</Link>
        ) : (
          <span className="badge L" title="Gestionar convocatorias requiere escritura (E) en MOD-008 — rol Supervisor">Solo lectura</span>
        )}
      </div>

      <div className="table-wrap" style={{ marginTop: 18 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Convocatoria</th>
              <th>Tipo</th>
              <th>Cupos</th>
              <th>Seleccionados (aprob.)</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay convocatorias.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.tipo}</td>
                  <td className="mono">{c.cupos}</td>
                  <td className="mono">{c.selecciones.length} / {c._count.selecciones}</td>
                  <td><span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span></td>
                  <td><Link href={`/convocatorias/${c.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} convocatoria(s).</p>
    </div>
  );
}
