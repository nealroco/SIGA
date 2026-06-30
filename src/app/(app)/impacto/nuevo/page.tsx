import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { generarAnalisis } from "@/actions/impacto";
import AnalisisForm from "@/components/AnalisisForm";

export const dynamic = "force-dynamic";

export default async function NuevoAnalisisPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-025", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo análisis de impacto</h1>
      <p className="page-sub">MOD-025 · calcula y registra el cruce entre ejecución financiera y cumplimiento físico para el período indicado.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Generar un análisis de impacto requiere <b>escritura (E)</b> en MOD-025. Tu rol (<b>{session?.user.rol}</b>)
          tiene solo lectura (RN-015). <Link href="/impacto">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <AnalisisForm action={generarAnalisis} />
        </div>
      )}
    </div>
  );
}
