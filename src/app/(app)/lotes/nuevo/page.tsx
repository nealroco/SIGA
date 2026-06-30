import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearLote } from "@/actions/lotes";
import LoteForm from "@/components/LoteForm";

export const dynamic = "force-dynamic";

export default async function NuevoLotePage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-017", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Nuevo lote</h1>
      <p className="page-sub">MOD-017 · alta de lote.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en Lotes (MOD-017), por lo que no
          puedes crear registros (RN-015). <Link href="/lotes">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <LoteForm action={crearLote} submitLabel="Crear lote" />
        </div>
      )}
    </div>
  );
}
