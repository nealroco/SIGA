import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearEvaluacion } from "@/actions/evaluacionEsal";
import EvaluacionEsalForm from "@/components/EvaluacionEsalForm";

export const dynamic = "force-dynamic";

export default async function NuevaEvaluacionEsalPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-009", "crear") : false;
  const terceros = await prisma.tercero.findMany({ where: { estado: "Activo" }, orderBy: { razonSocial: "asc" } });
  const convocatorias = await prisma.convocatoria.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 className="page-title">Nueva evaluación ESAL</h1>
      <p className="page-sub">MOD-009 · la evaluación quedará pendiente de aprobación del Supervisor.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar evaluaciones requiere <b>escritura (E)</b> en MOD-009 (rol <b>Administrador</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar. <Link href="/evaluacion-esal">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <EvaluacionEsalForm action={crearEvaluacion} terceros={terceros} convocatorias={convocatorias} submitLabel="Registrar evaluación" />
        </div>
      )}
    </div>
  );
}
