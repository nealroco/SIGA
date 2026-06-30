import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearEscenario } from "@/actions/reservas";
import EscenarioForm from "@/components/EscenarioForm";

export const dynamic = "force-dynamic";

export default async function NuevoEscenarioPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-022", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo escenario</h1>
      <p className="page-sub">MOD-022 · alta de escenario deportivo.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Crear escenarios requiere <b>escritura (E)</b> en MOD-022. Tu rol (<b>{session?.user.rol}</b>) no puede
          registrar (RN-015). <Link href="/reservas/escenarios">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <EscenarioForm action={crearEscenario} submitLabel="Crear escenario" />
        </div>
      )}
    </div>
  );
}
