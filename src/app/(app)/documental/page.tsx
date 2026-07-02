import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADOS = ["Pendiente", "Cargado", "En revisión", "Aprobado", "Rechazado", "Con observaciones"];

const ESTADO_BADGE: Record<string, string> = {
  Pendiente: "off",
  Cargado: "L",
  "En revisión": "A",
  Aprobado: "ok",
  Rechazado: "C",
  "Con observaciones": "A",
};

export default async function DocumentalPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-005", "ver"))) redirect("/dashboard");
  const puedeCrear = await can(session.user.rol, "MOD-005", "editar");

  const sp = await searchParams;
  const estado = sp.estado ?? "";
  const where: Prisma.DocumentoWhereInput = {};
  if (ESTADOS.includes(estado)) where.estado = estado;

  const items = await prisma.documento.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { contrato: true, _count: { select: { versiones: true } } },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Gestión documental</h1>
          <p className="page-sub">MOD-005 · expediente documental de los contratos. Evidencia versionada (RN-012, append-only).</p>
        </div>
        {puedeCrear ? (
          <Link href="/documental/nuevo" className="btn btn-primary">+ Nuevo documento</Link>
        ) : (
          <span className="badge L" title="Registrar documentos requiere escritura (E) en MOD-005">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 220 }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/documental" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Tipo de documento</th>
              <th>Obligatorio</th>
              <th>Estado</th>
              <th>Versiones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="empty">No hay documentos.</td></tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td className="doc">{d.contrato.numero}</td>
                  <td>{d.tipoDocumento}</td>
                  <td>
                    <span className={`badge ${d.obligatorio ? "C" : "off"}`}>{d.obligatorio ? "Obligatorio" : "Opcional"}</span>
                  </td>
                  <td><span className={`badge ${ESTADO_BADGE[d.estado] ?? "off"}`}>{d.estado}</span></td>
                  <td className="mono">{d._count.versiones}</td>
                  <td><Link href={`/documental/${d.id}`} className="btn btn-sm">Abrir</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} documento(s).</p>
    </div>
  );
}
