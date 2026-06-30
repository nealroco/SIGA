import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearComunicacion } from "@/actions/comunicaciones";
import ComunicacionForm from "@/components/ComunicacionForm";

export const dynamic = "force-dynamic";

export default async function NuevaComunicacionPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-019", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nueva comunicación</h1>
      <p className="page-sub">MOD-019 · la comunicación quedará en estado Borrador.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar comunicaciones requiere <b>escritura (E)</b> en MOD-019. Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015). <Link href="/comunicaciones">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ComunicacionForm action={crearComunicacion} submitLabel="Registrar comunicación" />
        </div>
      )}
    </div>
  );
}
