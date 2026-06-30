import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarSeguimiento } from "@/actions/seguimiento";
import SeguimientoForm from "@/components/SeguimientoForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Registrado: "A", Aprobado: "ok", Rechazado: "C", Cerrado: "off" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function SeguimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seguimientoId = Number(id);
  if (!seguimientoId) notFound();

  const s = await prisma.seguimiento.findUnique({
    where: { id: seguimientoId },
    include: { beneficiario: true, createdBy: true },
  });
  if (!s) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeEditar = await can(rol, "MOD-011", "editar");
  const beneficiarios = await prisma.beneficiario.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{s.actividad}</h1>
          <p className="page-sub">
            MOD-011 · <span className={`badge ${ESTADO_BADGE[s.estado] ?? "off"}`}>{s.estado}</span> · {s.beneficiario.nombre}
          </p>
        </div>
        <Link href="/seguimiento" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Beneficiario:</b> {s.beneficiario.nombre} (<span className="mono">{s.beneficiario.documento}</span>)</div>
          <div><b>Programa:</b> {s.programa ?? "—"}</div>
          <div><b>Fecha:</b> {fmt(s.fecha)}</div>
          <div><b>Actividad:</b> {s.actividad}</div>
          <div><b>Observación:</b> {s.observacion ?? "—"}</div>
          <div><b>Registrado por:</b> {s.createdBy?.nombre ?? "—"}</div>
        </div>
      </div>

      {puedeEditar ? (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <SeguimientoForm
            action={editarSeguimiento}
            beneficiarios={beneficiarios}
            submitLabel="Guardar cambios"
            values={{
              id: s.id,
              beneficiarioId: s.beneficiarioId,
              programa: s.programa,
              fecha: s.fecha ? s.fecha.toISOString() : null,
              actividad: s.actividad,
              observacion: s.observacion,
            }}
          />
        </div>
      ) : (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Editar seguimientos requiere escritura (E) en MOD-011 (RN-015).
        </div>
      )}
    </div>
  );
}
