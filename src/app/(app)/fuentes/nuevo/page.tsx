import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearFuente } from "@/actions/fuentes";
import FuenteForm from "@/components/FuenteForm";

export const dynamic = "force-dynamic";

export default async function NuevaFuentePage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-020", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nueva fuente de financiación</h1>
      <p className="page-sub">MOD-020 · la fuente quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar fuentes de financiación requiere <b>escritura (E)</b> en MOD-020 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/fuentes">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <FuenteForm action={crearFuente} submitLabel="Registrar fuente" />
        </div>
      )}
    </div>
  );
}
