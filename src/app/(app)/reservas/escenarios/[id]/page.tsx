import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarEscenario, darDeBajaEscenario } from "@/actions/reservas";
import EscenarioForm from "@/components/EscenarioForm";
import MapaUbicacion from "@/components/maps/MapaUbicacion";

export const dynamic = "force-dynamic";

export default async function EscenarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const escenarioId = Number(id);
  if (!escenarioId) notFound();

  const e = await prisma.escenario.findUnique({ where: { id: escenarioId } });
  if (!e) notFound();

  const session = await auth();
  const puedeEditar = session ? await can(session.user.rol, "MOD-022", "editar") : false;
  const puedeBaja = session ? await can(session.user.rol, "MOD-022", "eliminar") : false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{e.nombre}</h1>
          <p className="page-sub">
            MOD-022 · {e.tipo ?? "Sin tipo"} ·{" "}
            <span className={`badge ${e.estado === "Activo" ? "ok" : "off"}`}>{e.estado}</span>
          </p>
        </div>
        <Link href="/reservas/escenarios" className="btn">← Volver</Link>
      </div>

      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <p className="section-cap">Ubicación</p>
        <MapaUbicacion lat={e.lat} lng={e.lng} label={e.nombre} height={200} />
      </div>

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en MOD-022. Consulta sin edición (RN-015).
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <EscenarioForm
            action={editarEscenario}
            submitLabel="Guardar cambios"
            values={{
              id: e.id,
              nombre: e.nombre,
              tipo: e.tipo,
              direccion: e.direccion,
              capacidad: e.capacidad,
            }}
          />
        </div>
      )}

      {puedeBaja && e.estado === "Activo" && (
        <form action={darDeBajaEscenario} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={e.id} />
          <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>Dar de baja</b>
              <div className="page-sub">Baja lógica: pasa a Inactivo, nunca se elimina el histórico.</div>
            </div>
            <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
              Dar de baja
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
