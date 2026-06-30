import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarPersonal, darDeBajaPersonal } from "@/actions/personal";
import PersonalForm from "@/components/PersonalForm";

export const dynamic = "force-dynamic";

export default async function PersonalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const personalId = Number(id);
  if (!personalId) notFound();

  const p = await prisma.personal.findUnique({ where: { id: personalId } });
  if (!p) notFound();

  const session = await auth();
  const puedeEditar = session ? await can(session.user.rol, "MOD-002", "editar") : false;
  const puedeBaja = session ? await can(session.user.rol, "MOD-002", "eliminar") : false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{p.nombre}</h1>
          <p className="page-sub">
            MOD-002 · <span className="mono">{p.documento}</span> ·{" "}
            <span className={`badge ${p.estado === "Activo" ? "ok" : "off"}`}>{p.estado}</span>
          </p>
        </div>
        <Link href="/personal" className="btn">← Volver</Link>
      </div>

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en MOD-002. Consulta sin edición (RN-015).
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <PersonalForm
            action={editarPersonal}
            submitLabel="Guardar cambios"
            values={{
              id: p.id,
              documento: p.documento,
              nombre: p.nombre,
              cargo: p.cargo,
              perfil: p.perfil,
              tipoVinculacion: p.tipoVinculacion,
              fechaIngreso: p.fechaIngreso ? p.fechaIngreso.toISOString() : null,
              correo: p.correo,
              telefono: p.telefono,
            }}
          />
        </div>
      )}

      {puedeBaja && p.estado === "Activo" && (
        <form action={darDeBajaPersonal} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={p.id} />
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
