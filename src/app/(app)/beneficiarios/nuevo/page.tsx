import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearBeneficiario } from "@/actions/beneficiarios";
import BeneficiarioForm from "@/components/BeneficiarioForm";

export const dynamic = "force-dynamic";

export default async function NuevoBeneficiarioPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-001", "crear") : false;
  const territorios = await prisma.territorio.findMany({ where: { estado: "Activo" }, orderBy: { municipio: "asc" } });

  return (
    <div>
      <h1 className="page-title">Nuevo beneficiario</h1>
      <p className="page-sub">MOD-001 · alta de beneficiario.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en Beneficiarios (MOD-001), por lo que no
          puedes crear registros (RN-015). <Link href="/beneficiarios">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <BeneficiarioForm action={crearBeneficiario} submitLabel="Crear beneficiario" territorios={territorios} />
        </div>
      )}
    </div>
  );
}
