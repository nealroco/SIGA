import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearReserva } from "@/actions/reservas";
import ReservaForm from "@/components/ReservaForm";

export const dynamic = "force-dynamic";

export default async function NuevaReservaPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-022", "crear") : false;
  const puedeCargar = session ? await can(session.user.rol, "MOD-022", "cargar") : false;
  const escenarios = await prisma.escenario.findMany({ where: { estado: "Activo" }, orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 className="page-title">Nueva reserva</h1>
      <p className="page-sub">MOD-022 · RN-024: se rechaza automáticamente si se solapa con otra reserva activa (margen 30 min).</p>

      {!puedeCrear && !puedeCargar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Crear reservas requiere <b>escritura (E)</b> o <b>carga (C)</b> en MOD-022. Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015). <Link href="/reservas">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <ReservaForm
            action={crearReserva}
            escenarios={escenarios}
            esAdministrador={session?.user.rol === "Administrador"}
            submitLabel="Crear reserva"
          />
        </div>
      )}
    </div>
  );
}
