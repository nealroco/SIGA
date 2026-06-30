import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearRegistroSecop } from "@/actions/secop";
import SecopForm from "@/components/SecopForm";

export const dynamic = "force-dynamic";

export default async function NuevoRegistroSecopPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-027", "crear") : false;
  const contratos = await prisma.contrato.findMany({ orderBy: { numero: "asc" } });

  return (
    <div>
      <h1 className="page-title">Registrar en SECOP II</h1>
      <p className="page-sub">MOD-027 · el registro quedará pendiente de aprobación (RN-025).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar en SECOP II requiere <b>escritura (E)</b> en MOD-027 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/secop">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <SecopForm action={crearRegistroSecop} contratos={contratos} submitLabel="Registrar en SECOP" />
        </div>
      )}
    </div>
  );
}
