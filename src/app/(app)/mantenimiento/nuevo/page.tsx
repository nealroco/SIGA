import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearMantenimiento } from "@/actions/mantenimiento";
import MantenimientoForm from "@/components/MantenimientoForm";

export const dynamic = "force-dynamic";

export default async function NuevoMantenimientoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-023", "crear") : false;
  const escenarios = await prisma.escenario.findMany({ where: { estado: "Activo" }, orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 className="page-title">Nuevo mantenimiento</h1>
      <p className="page-sub">MOD-023 · registra un mantenimiento programado, correctivo o de emergencia.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar mantenimientos requiere <b>escritura (E)</b> en MOD-023 (roles <b>Administrador</b> / <b>Infraestructura</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015). <Link href="/mantenimiento">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <MantenimientoForm action={crearMantenimiento} escenarios={escenarios} submitLabel="Registrar mantenimiento" />
        </div>
      )}
    </div>
  );
}
