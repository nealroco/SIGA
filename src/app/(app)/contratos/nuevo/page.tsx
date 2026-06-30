import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearContrato } from "@/actions/contratos";
import ContratoForm from "@/components/ContratoForm";

export const dynamic = "force-dynamic";

export default async function NuevoContratoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-010", "crear") : false;
  const terceros = await prisma.tercero.findMany({ where: { estado: "Activo" }, orderBy: { razonSocial: "asc" } });

  return (
    <div>
      <h1 className="page-title">Registrar contrato</h1>
      <p className="page-sub">MOD-010 · el contrato quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar contratos requiere <b>escritura (E)</b> en MOD-010 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/contratos">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ContratoForm action={crearContrato} terceros={terceros} submitLabel="Registrar contrato" />
        </div>
      )}
    </div>
  );
}
