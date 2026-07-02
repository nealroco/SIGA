import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  Registrado: "A",
  Aprobado: "L",
  Rechazado: "C",
  Sincronizado: "ok",
};

export default async function SecopPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-027", "crear") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.RegistroSecopWhereInput = {};
  if (["Registrado", "Aprobado", "Rechazado", "Sincronizado"].includes(estado)) where.estadoSync = estado;

  const items = await prisma.registroSecop.findMany({ where, orderBy: { createdAt: "desc" }, include: { contrato: true }, take: 200 });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">SECOP II</h1>
          <p className="page-sub">MOD-027 · integración SECOP II. Doble aprobación RN-025 (Financiera registra · Administrador aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/secop/nuevo" className="btn btn-primary">+ Registrar en SECOP</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-027 — rol Financiera">Sin registro</span>
        )}
      </div>

      <form className="toolbar" method="get">
        <select className="select" name="estado" defaultValue={estado} style={{ width: 200 }}>
          <option value="">Todos los estados</option>
          <option value="Registrado">Registrado</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
          <option value="Sincronizado">Sincronizado</option>
        </select>
        <button className="btn btn-blue" type="submit">Filtrar</button>
        {estado && <Link href="/secop" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Proceso SECOP</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="empty">No hay registros SECOP.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td className="doc">{r.contrato.numero}</td>
                  <td className="mono">{r.procesoSecop}</td>
                  <td><span className={`badge ${ESTADO_BADGE[r.estadoSync] ?? "off"}`}>{r.estadoSync}</span></td>
                  <td><Link href={`/secop/${r.id}`} className="btn btn-sm">Abrir</Link></td>
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
