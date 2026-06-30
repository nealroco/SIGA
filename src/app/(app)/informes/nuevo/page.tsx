import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearInforme } from "@/actions/informes";
import InformeForm from "@/components/InformeForm";

export const dynamic = "force-dynamic";

export default async function NuevoInformePage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-006", "editar") : false;
  const contratos = await prisma.contrato.findMany({
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, objeto: true },
  });

  return (
    <div>
      <h1 className="page-title">Radicar informe</h1>
      <p className="page-sub">MOD-006 · el informe quedará en estado Radicado. No se admite radicación en un periodo cerrado (RN-022).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Radicar informes requiere <b>escritura (E)</b> en MOD-006. Tu rol (<b>{session?.user.rol}</b>) tiene solo lectura.
          <Link href="/informes"> Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <InformeForm action={crearInforme} contratos={contratos} submitLabel="Radicar informe" />
        </div>
      )}
    </div>
  );
}
