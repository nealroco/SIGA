import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearConvocatoria } from "@/actions/convocatorias";
import ConvocatoriaForm from "@/components/ConvocatoriaForm";

export const dynamic = "force-dynamic";

export default async function NuevaConvocatoriaPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-008", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nueva convocatoria</h1>
      <p className="page-sub">MOD-008 · apertura de convocatoria.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Gestionar convocatorias requiere <b>escritura (E)</b> en MOD-008 (rol <b>Supervisor</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede crear convocatorias (RN-027 — segregación de la selección). <Link href="/convocatorias">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ConvocatoriaForm action={crearConvocatoria} submitLabel="Crear convocatoria" />
        </div>
      )}
    </div>
  );
}
