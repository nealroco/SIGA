import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BeneficiariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-001", "crear") : false;

  const q = (sp.q ?? "").trim();
  const estado = sp.estado ?? "";

  const where: Prisma.BeneficiarioWhereInput = {};
  if (q) {
    where.OR = [{ nombre: { contains: q } }, { documento: { contains: q } }, { programa: { contains: q } }];
  }
  if (estado === "Activo" || estado === "Inactivo") where.estado = estado;

  const items = await prisma.beneficiario.findMany({ where, orderBy: { createdAt: "desc" }, include: { territorio: true } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Beneficiarios</h1>
          <p className="page-sub">MOD-001 · registro y caracterización de beneficiarios.</p>
        </div>
        {puedeCrear ? (
          <Link href="/beneficiarios/nuevo" className="btn btn-primary">+ Nuevo beneficiario</Link>
        ) : (
          <span className="badge L" title="Tu rol tiene solo lectura en MOD-001">Solo lectura</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <input
          className="input grow"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, documento o programa…"
        />
        <select className="select" name="estado" defaultValue={estado} style={{ width: 170 }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {(q || estado) && <Link href="/beneficiarios" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Edad</th>
              <th>Programa</th>
              <th>Territorio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="empty">No hay beneficiarios que coincidan.</td></tr>
            ) : (
              items.map((b) => (
                <tr key={b.id}>
                  <td className="doc">{b.documento}</td>
                  <td>{b.nombre}</td>
                  <td className="mono">{b.edad ?? "—"}</td>
                  <td>{b.programa ?? "—"}</td>
                  <td>{b.territorio ? `${b.territorio.municipio}${b.territorio.zona ? " — " + b.territorio.zona : ""}` : "—"}</td>
                  <td>
                    <span className={`badge ${b.estado === "Activo" ? "ok" : "off"}`}>{b.estado}</span>
                  </td>
                  <td>
                    <Link href={`/beneficiarios/${b.id}`} className="btn btn-sm">Ver / editar</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} registro(s).</p>
    </div>
  );
}
