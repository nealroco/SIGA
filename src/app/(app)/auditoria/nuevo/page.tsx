import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearHallazgo } from "@/actions/auditoria";
import HallazgoForm from "@/components/HallazgoForm";

export const dynamic = "force-dynamic";

export default async function NuevoHallazgoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-026", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo hallazgo de auditoría</h1>
      <p className="page-sub">MOD-026 · registra una observación de auditoría interna sobre cualquier módulo del sistema.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar hallazgos requiere <b>escritura (E)</b> en MOD-026 (roles <b>Supervisor</b> y <b>Revisor</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015). <Link href="/auditoria">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <HallazgoForm action={crearHallazgo} submitLabel="Registrar hallazgo" />
        </div>
      )}
    </div>
  );
}
