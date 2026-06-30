import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearEvaluacionPsico } from "@/actions/psicosocial";
import PsicosocialForm from "@/components/PsicosocialForm";

export const dynamic = "force-dynamic";

export default async function NuevaEvaluacionPsicoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-018", "crear") : false;
  const beneficiarios = await prisma.beneficiario.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Nueva evaluación psicosocial</h1>
      <p className="page-sub">MOD-018 · registro de evaluación psicosocial de un beneficiario.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar evaluaciones psicosociales requiere <b>escritura (E)</b> en MOD-018. Tu rol (<b>{session?.user.rol}</b>)
          tiene solo lectura (RN-015). <Link href="/psicosocial">Volver al listado</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <PsicosocialForm action={crearEvaluacionPsico} beneficiarios={beneficiarios} submitLabel="Registrar evaluación" />
        </div>
      )}
    </div>
  );
}
