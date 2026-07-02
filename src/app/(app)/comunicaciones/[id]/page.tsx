import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarComunicacion, marcarEnviada } from "@/actions/comunicaciones";
import ComunicacionForm from "@/components/ComunicacionForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Borrador: "A", Enviada: "ok" };
const fmt = (d: Date) => new Date(d).toLocaleString("es-CO");

export default async function ComunicacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comunicacionId = Number(id);
  if (!comunicacionId) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-019", "ver"))) redirect("/comunicaciones");

  const c = await prisma.comunicacion.findUnique({
    where: { id: comunicacionId },
    select: {
      id: true,
      asunto: true,
      tipo: true,
      canal: true,
      publico: true,
      estado: true,
      contenido: true,
      createdAt: true,
      createdBy: { select: { nombre: true } },
    },
  });
  if (!c) notFound();

  const puedeEditar = (await can(rol, "MOD-019", "editar")) && c.estado === "Borrador";
  const puedeMarcarEnviada = puedeEditar; // misma condición: editar (E) + estado Borrador

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{c.asunto}</h1>
          <p className="page-sub">
            MOD-019 · <span className={`badge ${ESTADO_BADGE[c.estado] ?? "off"}`}>{c.estado}</span> · {c.tipo}
          </p>
        </div>
        <Link href="/comunicaciones" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Tipo:</b> {c.tipo}</div>
          <div><b>Canal:</b> {c.canal ?? "—"}</div>
          <div><b>Público:</b> {c.publico ?? "—"}</div>
          <div><b>Registrado por:</b> {c.createdBy?.nombre ?? "—"}</div>
          <div><b>Fecha:</b> {fmt(c.createdAt)}</div>
        </div>
        {c.contenido && (
          <div style={{ marginTop: 14 }}>
            <b>Contenido:</b>
            <p className="page-sub" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{c.contenido}</p>
          </div>
        )}
      </div>

      {puedeMarcarEnviada && (
        <form action={marcarEnviada} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={c.id} />
          <div>
            <b>Marcar como enviada</b>
            <div className="page-sub">La comunicación pasará de Borrador a Enviada.</div>
          </div>
          <button className="btn btn-blue" type="submit">Marcar como enviada</button>
        </form>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <ComunicacionForm
            action={editarComunicacion}
            submitLabel="Guardar cambios"
            values={{
              id: c.id,
              tipo: c.tipo,
              canal: c.canal,
              asunto: c.asunto,
              contenido: c.contenido,
              publico: c.publico,
            }}
          />
        </div>
      )}

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>) o la comunicación ya fue enviada.
        </div>
      )}
    </div>
  );
}
