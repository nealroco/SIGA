import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { crearItem } from "@/actions/inventarios";
import ItemForm from "@/components/ItemForm";

export const dynamic = "force-dynamic";

export default async function NuevoItemPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-004", "crear") : false;

  return (
    <div>
      <h1 className="page-title">Registrar ítem</h1>
      <p className="page-sub">MOD-004 · alta de un nuevo ítem de inventario.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar ítems requiere <b>escritura (E)</b> en MOD-004. Tu rol (<b>{session?.user.rol}</b>) no puede registrar (RN-015). <Link href="/inventarios">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ItemForm action={crearItem} submitLabel="Registrar ítem" />
        </div>
      )}
    </div>
  );
}
