import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarBeneficiario, darDeBajaBeneficiario } from "@/actions/beneficiarios";
import BeneficiarioForm from "@/components/BeneficiarioForm";

export const dynamic = "force-dynamic";

export default async function BeneficiarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const beneficiarioId = Number(id);
  if (!beneficiarioId) notFound();

  const b = await prisma.beneficiario.findUnique({ where: { id: beneficiarioId } });
  if (!b) notFound();

  const session = await auth();
  const puedeEditar = session ? await can(session.user.rol, "MOD-001", "editar") : false;
  const puedeBaja = session ? await can(session.user.rol, "MOD-001", "eliminar") : false;
  const territorios = await prisma.territorio.findMany({ where: { estado: "Activo" }, orderBy: { municipio: "asc" } });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{b.nombre}</h1>
          <p className="page-sub">
            MOD-001 · <span className="mono">{b.documento}</span> ·{" "}
            <span className={`badge ${b.estado === "Activo" ? "ok" : "off"}`}>{b.estado}</span>
          </p>
        </div>
        <Link href="/beneficiarios" className="btn">← Volver</Link>
      </div>

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en MOD-001. Consulta sin edición (RN-015).
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <BeneficiarioForm
            action={editarBeneficiario}
            submitLabel="Guardar cambios"
            territorios={territorios}
            values={{
              id: b.id,
              documento: b.documento,
              nombre: b.nombre,
              edad: b.edad,
              sexo: b.sexo,
              programa: b.programa,
              territorioId: b.territorioId,
              acudiente: b.acudiente,
            }}
          />
        </div>
      )}

      {puedeBaja && b.estado === "Activo" && (
        <form action={darDeBajaBeneficiario} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={b.id} />
          <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>Dar de baja</b>
              <div className="page-sub">Baja lógica: pasa a Inactivo, nunca se elimina el histórico (RN-002).</div>
            </div>
            <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>
              Dar de baja
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
