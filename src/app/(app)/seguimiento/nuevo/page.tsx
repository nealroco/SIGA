import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearSeguimiento } from "@/actions/seguimiento";
import SeguimientoForm from "@/components/SeguimientoForm";

export const dynamic = "force-dynamic";

export default async function NuevoSeguimientoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-011", "crear") : false;
  const beneficiarios = await prisma.beneficiario.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Nuevo seguimiento</h1>
      <p className="page-sub">MOD-011 · registro de actividad de un beneficiario.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar seguimientos requiere <b>escritura (E)</b> en MOD-011. Tu rol (<b>{session?.user.rol}</b>)
          tiene solo lectura (RN-015). <Link href="/seguimiento">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <SeguimientoForm action={crearSeguimiento} beneficiarios={beneficiarios} submitLabel="Crear seguimiento" />
        </div>
      )}
    </div>
  );
}
