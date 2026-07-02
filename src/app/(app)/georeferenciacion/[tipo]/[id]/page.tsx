import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import CoordenadasForm from "@/components/CoordenadasForm";

export const dynamic = "force-dynamic";

export default async function GeoreferenciacionDetallePage({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const { tipo: tipoParam, id } = await params;
  const tipo = decodeURIComponent(tipoParam);
  const entidadId = Number(id);
  if (!entidadId || (tipo !== "Territorio" && tipo !== "Escenario")) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");
  const rol = session.user.rol;
  if (!(await can(rol, "MOD-024", "ver"))) redirect("/dashboard");
  const puedeEditar = await can(rol, "MOD-024", "editar");

  let nombre: string;
  let lat: number | null;
  let lng: number | null;

  if (tipo === "Territorio") {
    const t = await prisma.territorio.findUnique({ where: { id: entidadId } });
    if (!t) notFound();
    nombre = `${t.codigo} · ${t.municipio}`;
    lat = t.lat;
    lng = t.lng;
  } else {
    const e = await prisma.escenario.findUnique({ where: { id: entidadId } });
    if (!e) notFound();
    nombre = e.tipo ? `${e.nombre} · ${e.tipo}` : e.nombre;
    lat = e.lat;
    lng = e.lng;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{nombre}</h1>
          <p className="page-sub">MOD-024 · Georeferenciación · {tipo}</p>
        </div>
        <Link href="/georeferenciacion" className="btn">← Volver</Link>
      </div>

      <div style={{ marginTop: 18 }}>
        {puedeEditar ? (
          <CoordenadasForm tipo={tipo} id={entidadId} nombre={nombre} lat={lat} lng={lng} />
        ) : (
          <div className="card" style={{ padding: 22, maxWidth: 560 }}>
            <p className="section-cap">Coordenadas actuales</p>
            <div className="form-grid" style={{ gap: "10px 18px" }}>
              <div><b>Latitud:</b> <span className="mono">{lat ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</span></div>
              <div><b>Longitud:</b> <span className="mono">{lng ?? <span style={{ color: "var(--coral)" }}>Sin ubicar</span>}</span></div>
            </div>
            <div className="alert info" style={{ marginTop: 14 }}>
              Editar coordenadas requiere <b>escritura (E)</b> en MOD-024. Tu rol (<b>{rol}</b>) tiene acceso de solo lectura.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
