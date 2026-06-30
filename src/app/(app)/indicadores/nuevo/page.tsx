import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import IndicadorForm from "@/components/IndicadorForm";

export const dynamic = "force-dynamic";

export default async function NuevoIndicadorPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-016", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo indicador físico</h1>
      <p className="page-sub">MOD-016 · define la meta programada del indicador para el período.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar indicadores requiere <b>escritura (E)</b> en MOD-016. Tu rol (<b>{session?.user.rol}</b>) no puede
          registrar (RN-015). <Link href="/indicadores">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <IndicadorForm />
        </div>
      )}
    </div>
  );
}
