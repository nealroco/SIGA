import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearTerritorio } from "@/actions/territorios";
import TerritorioForm from "@/components/TerritorioForm";

export const dynamic = "force-dynamic";

export default async function NuevoTerritorioPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-012", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo territorio</h1>
      <p className="page-sub">MOD-012 · alta de territorio (caracterización territorial).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en Territorios (MOD-012), por lo que no
          puedes crear registros (RN-015). <Link href="/territorios">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <TerritorioForm action={crearTerritorio} submitLabel="Crear territorio" />
        </div>
      )}
    </div>
  );
}
