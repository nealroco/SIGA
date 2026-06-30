import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearRubro } from "@/actions/rubros";
import RubroForm from "@/components/RubroForm";

export const dynamic = "force-dynamic";

export default async function NuevoRubroPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-003", "crear") : false;
  const fuentes = await prisma.fuenteFinanciacion.findMany({ where: { estado: "Aprobada" }, orderBy: { codigo: "asc" } });

  return (
    <div>
      <h1 className="page-title">Nuevo rubro</h1>
      <p className="page-sub">MOD-003 · la meta de inversión quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Proponer un rubro requiere <b>escritura (E)</b> en MOD-003 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/rubros">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <RubroForm action={crearRubro} fuentes={fuentes} submitLabel="Proponer rubro" />
        </div>
      )}
    </div>
  );
}
