import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const ESTADO_BADGE: Record<string, string> = {
  Registrada: "A",
  Aprobada: "ok",
  Rechazada: "C",
};

export default async function FuentesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-020", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-020", "crear");

  const estado = sp.estado ?? "";
  const where: Prisma.FuenteFinanciacionWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada"].includes(estado)) where.estado = estado;

  const items = await prisma.fuenteFinanciacion.findMany({ where, orderBy: { createdAt: "desc" } });
  const rubrosPorFuente = await prisma.rubro.findMany({ where: { estado: "Aprobado" }, select: { fuenteId: true, valorAsignado: true } });
  const comprometidoPorFuente = new Map<number, number>();
  for (const r of rubrosPorFuente) comprometidoPorFuente.set(r.fuenteId, (comprometidoPorFuente.get(r.fuenteId) ?? 0) + r.valorAsignado);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Fuentes de financiación</h1>
          <p className="page-sub">
            MOD-020 · gobierno financiero. Doble aprobación RN-025 (Financiera registra · Administrador aprueba).
            Ver <Link href="/rubros" className="mono" style={{ color: "var(--blue)" }}>Rubros y control de inversión →</Link>
          </p>
        </div>
        {puedeCrear ? (
          <Link href="/fuentes/nuevo" className="btn btn-primary">+ Nueva fuente</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-020 — rol Financiera">Sin registro</span>
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
        {estado && <Link href="/fuentes" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Disponible</th>
              <th>Comprometido en rubros</th>
              <th>Libre</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="empty">No hay fuentes de financiación.</td></tr>
            ) : (
              items.map((f) => {
                const comprometido = comprometidoPorFuente.get(f.id) ?? 0;
                const libre = f.valorDisponible - comprometido;
                return (
                  <tr key={f.id}>
                    <td className="doc">{f.codigo}</td>
                    <td>{f.nombre}</td>
                    <td>{f.tipo ?? "—"}</td>
                    <td className="mono">{cop.format(f.valorDisponible)}</td>
                    <td className="mono">{cop.format(comprometido)}</td>
                    <td className="mono" style={{ color: libre < 0 ? "var(--coral)" : undefined }}>{cop.format(libre)}</td>
                    <td><span className={`badge ${ESTADO_BADGE[f.estado] ?? "off"}`}>{f.estado}</span></td>
                    <td><Link href={`/fuentes/${f.id}`} className="btn btn-sm">Abrir</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} fuente(s).</p>
    </div>
  );
}
