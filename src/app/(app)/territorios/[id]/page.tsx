import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarTerritorio, darDeBajaTerritorio } from "@/actions/territorios";
import TerritorioForm from "@/components/TerritorioForm";
import MapaUbicacion from "@/components/maps/MapaUbicacion";

export const dynamic = "force-dynamic";

export default async function TerritorioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const territorioId = Number(id);
  if (!territorioId) notFound();

  const t = await prisma.territorio.findUnique({ where: { id: territorioId } });
  if (!t) notFound();

  const session = await auth();
  const puedeEditar = session ? await can(session.user.rol, "MOD-012", "editar") : false;
  const puedeBaja = session ? await can(session.user.rol, "MOD-012", "eliminar") : false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{t.municipio}</h1>
          <p className="page-sub">
            MOD-012 · <span className="mono">{t.codigo}</span> ·{" "}
            <span className={`badge ${t.estado === "Activo" ? "ok" : "off"}`}>{t.estado}</span>
          </p>
        </div>
        <Link href="/territorios" className="btn">← Volver</Link>
      </div>

      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <p className="section-cap">Ubicación</p>
        <MapaUbicacion lat={t.lat} lng={t.lng} label={t.municipio} height={200} />
      </div>

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en MOD-012. Consulta sin edición (RN-015).
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <TerritorioForm
            action={editarTerritorio}
            submitLabel="Guardar cambios"
            values={{
              id: t.id,
              codigo: t.codigo,
              municipio: t.municipio,
              zona: t.zona,
              poblacion: t.poblacion,
              lat: t.lat,
              lng: t.lng,
            }}
          />
        </div>
      )}

      {puedeBaja && t.estado === "Activo" && (
        <form action={darDeBajaTerritorio} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={t.id} />
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
