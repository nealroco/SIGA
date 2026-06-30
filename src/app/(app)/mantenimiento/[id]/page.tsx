import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarMantenimiento, cerrarMantenimiento } from "@/actions/mantenimiento";
import MantenimientoForm from "@/components/MantenimientoForm";

export const dynamic = "force-dynamic";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const ESTADO_BADGE: Record<string, string> = { Programado: "L", "En curso": "A", Cerrado: "off" };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO") : "—");

export default async function MantenimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mantenimientoId = Number(id);
  if (!mantenimientoId) notFound();

  const m = await prisma.mantenimiento.findUnique({
    where: { id: mantenimientoId },
    include: { escenario: true, createdBy: true },
  });
  if (!m) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeEditar = (await can(rol, "MOD-023", "editar")) && m.estado !== "Cerrado";
  const escenarios = await prisma.escenario.findMany({ where: { estado: "Activo" }, orderBy: { nombre: "asc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{m.escenario.nombre}</h1>
          <p className="page-sub">
            MOD-023 · <span className={`badge ${ESTADO_BADGE[m.estado] ?? "off"}`}>{m.estado}</span> · {m.tipo}
          </p>
        </div>
        <Link href="/mantenimiento" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Escenario:</b> {m.escenario.nombre}</div>
          <div><b>Tipo:</b> {m.tipo}</div>
          <div><b>Descripción:</b> {m.descripcion ?? "—"}</div>
          <div><b>Costo:</b> <span className="mono">{cop.format(m.costo)}</span></div>
          <div><b>Inicio:</b> {fmt(m.fechaInicio)}</div>
          <div><b>Fin:</b> {fmt(m.fechaFin)}</div>
          <div><b>Registrado por:</b> {m.createdBy?.nombre ?? "—"}</div>
          <div>
            <b>Cerrado a tiempo (KPI-029b):</b>{" "}
            {m.estado === "Cerrado" ? (m.cerradoATiempo ? "✓ Sí" : "✗ No") : "—"}
          </div>
        </div>
      </div>

      {puedeEditar && m.estado !== "Cerrado" && (
        <form action={cerrarMantenimiento} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <input type="hidden" name="id" value={m.id} />
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="cerradoATiempo">Cerrar mantenimiento — ¿se cerró a tiempo?</label>
            <select id="cerradoATiempo" name="cerradoATiempo" className="select" defaultValue="true" style={{ width: 160 }}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <button className="btn btn-blue" type="submit">Cerrar mantenimiento</button>
        </form>
      )}

      {puedeEditar && (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <MantenimientoForm
            action={editarMantenimiento}
            escenarios={escenarios}
            submitLabel="Guardar cambios"
            values={{
              id: m.id,
              escenarioId: m.escenarioId,
              tipo: m.tipo,
              descripcion: m.descripcion,
              fechaInicio: m.fechaInicio ? m.fechaInicio.toISOString() : null,
              fechaFin: m.fechaFin ? m.fechaFin.toISOString() : null,
              costo: m.costo,
            }}
          />
        </div>
      )}

      {!puedeEditar && (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). El registro y cierre lo hacen Administrador / Infraestructura (E) — RN-015.
        </div>
      )}
    </div>
  );
}
