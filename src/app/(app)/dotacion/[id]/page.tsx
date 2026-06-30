import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { marcarDevuelta } from "@/actions/dotacion";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Entregada: "ok", Devuelta: "off" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function DotacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entregaId = Number(id);
  if (!entregaId) notFound();

  const e = await prisma.dotacionEntrega.findUnique({
    where: { id: entregaId },
    include: { beneficiario: true, item: true, createdBy: true },
  });
  if (!e) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeEditar = (await can(rol, "MOD-013", "editar")) && e.estado === "Entregada";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Entrega #{e.id}</h1>
          <p className="page-sub">
            MOD-013 · <span className={`badge ${ESTADO_BADGE[e.estado] ?? "off"}`}>{e.estado}</span> · {e.beneficiario.nombre}
          </p>
        </div>
        <Link href="/dotacion" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Beneficiario:</b> {e.beneficiario.nombre} ({e.beneficiario.documento})</div>
          <div><b>Ítem:</b> {e.item.codigo} · {e.item.nombre}</div>
          <div><b>Cantidad:</b> <span className="mono">{e.cantidad}</span></div>
          <div><b>Fecha entrega:</b> {fmt(e.fechaEntrega)}</div>
          <div><b>Registrado por:</b> {e.createdBy?.nombre ?? "—"}</div>
          <div><b>Stock actual del ítem:</b> <span className="mono">{e.item.cantidad}</span></div>
        </div>
      </div>

      {puedeEditar && (
        <form action={marcarDevuelta} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={e.id} />
          <div>
            <b>Marcar como devuelta</b>
            <div className="page-sub">Repone el stock del ítem ({e.cantidad} unidad(es)).</div>
          </div>
          <button className="btn btn-blue" type="submit">Marcar como devuelta</button>
        </form>
      )}

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          {e.estado === "Devuelta"
            ? "Esta entrega ya fue marcada como devuelta."
            : `Vista de solo lectura para tu rol (${rol}). Marcar como devuelta requiere escritura (E) en MOD-013.`}
        </div>
      )}
    </div>
  );
}
