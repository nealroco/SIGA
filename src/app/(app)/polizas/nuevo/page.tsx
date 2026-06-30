import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearPoliza } from "@/actions/polizas";
import PolizaForm from "@/components/PolizaForm";

export const dynamic = "force-dynamic";

export default async function NuevaPolizaPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-014", "crear") : false;
  const contratos = await prisma.contrato.findMany({ orderBy: { numero: "asc" } });

  return (
    <div>
      <h1 className="page-title">Registrar póliza</h1>
      <p className="page-sub">MOD-014 · la póliza quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar pólizas requiere <b>escritura (E)</b> en MOD-014 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/polizas">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <PolizaForm action={crearPoliza} contratos={contratos} submitLabel="Registrar póliza" />
        </div>
      )}
    </div>
  );
}
