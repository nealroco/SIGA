import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearActa } from "@/actions/comite";
import ActaForm from "@/components/ActaForm";

export const dynamic = "force-dynamic";

export default async function NuevaActaPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-015", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nueva acta de comité</h1>
      <p className="page-sub">MOD-015 · el acta quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar actas requiere <b>escritura (E)</b> en MOD-015 (rol <b>Supervisor</b> o <b>Coord. deportiva</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/comite">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ActaForm action={crearActa} submitLabel="Registrar acta" />
        </div>
      )}
    </div>
  );
}
