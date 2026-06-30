import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearPersonal } from "@/actions/personal";
import PersonalForm from "@/components/PersonalForm";

export const dynamic = "force-dynamic";

export default async function NuevoPersonalPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-002", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo personal</h1>
      <p className="page-sub">MOD-002 · alta de personal.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en Personal (MOD-002), por lo que no
          puedes crear registros (RN-015). <Link href="/personal">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <PersonalForm action={crearPersonal} submitLabel="Crear personal" />
        </div>
      )}
    </div>
  );
}
