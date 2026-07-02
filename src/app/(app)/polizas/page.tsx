import Link from "next/link";
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

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function PolizasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-014", "crear") : false;

  const estado = sp.estado ?? "";
  const where: Prisma.PolizaWhereInput = {};
  if (["Registrada", "Aprobada", "Rechazada"].includes(estado)) where.estado = estado;

  const items = await prisma.poliza.findMany({ where, orderBy: { createdAt: "desc" }, include: { contrato: true }, take: 200 });
  const hoy = new Date();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Pólizas</h1>
          <p className="page-sub">MOD-014 · control de pólizas. Doble aprobación RN-025 (Financiera registra · Administrador aprueba).</p>
        </div>
        {puedeCrear ? (
          <Link href="/polizas/nuevo" className="btn btn-primary">+ Registrar póliza</Link>
        ) : (
          <span className="badge L" title="Registrar requiere escritura (E) en MOD-014 — rol Financiera">Sin registro</span>
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
        {estado && <Link href="/polizas" className="btn">Limpiar</Link>}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Tipo</th>
              <th>Aseguradora</th>
              <th>Valor</th>
              <th>Vigencia hasta</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="empty">No hay pólizas.</td></tr>
            ) : (
              items.map((p) => {
                const vencida = p.estado === "Aprobada" && p.vigenciaHasta != null && p.vigenciaHasta < hoy;
                return (
                  <tr key={p.id}>
                    <td className="doc">{p.contrato.numero}</td>
                    <td>{p.tipo ?? "—"}</td>
                    <td>{p.aseguradora ?? "—"}</td>
                    <td className="mono">{cop.format(p.valor)}</td>
                    <td>{fmt(p.vigenciaHasta)}</td>
                    <td>
                      <span className={`badge ${ESTADO_BADGE[p.estado] ?? "off"}`}>{p.estado}</span>
                      {vencida && (
                        <span className="badge" style={{ marginLeft: 6, background: "#fdecea", color: "#b42318", borderColor: "#f6c9c3" }}>
                          Vencida
                        </span>
                      )}
                    </td>
                    <td><Link href={`/polizas/${p.id}`} className="btn btn-sm">Abrir</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>{items.length} póliza(s).</p>
    </div>
  );
}
