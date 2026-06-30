import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarLote, darDeBajaLote } from "@/actions/lotes";
import LoteForm from "@/components/LoteForm";

export const dynamic = "force-dynamic";

export default async function LoteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loteId = Number(id);
  if (!loteId) notFound();

  const l = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!l) notFound();

  const session = await auth();
  const puedeEditar = session ? await can(session.user.rol, "MOD-017", "editar") : false;
  const puedeBaja = session ? await can(session.user.rol, "MOD-017", "eliminar") : false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{l.codigo}</h1>
          <p className="page-sub">
            MOD-017 · <span className={`badge ${l.estado === "Activo" ? "ok" : "off"}`}>{l.estado}</span>
            {l.territorio ? <> · {l.territorio}</> : null}
          </p>
        </div>
        <Link href="/lotes" className="btn">← Volver</Link>
      </div>

      {!puedeEditar ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Tu rol (<b>{session?.user.rol}</b>) tiene <b>solo lectura</b> en MOD-017. Consulta sin edición (RN-015).
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <LoteForm
            action={editarLote}
            submitLabel="Guardar cambios"
            values={{
              id: l.id,
              codigo: l.codigo,
              direccion: l.direccion,
              area: l.area,
              territorio: l.territorio,
            }}
          />
        </div>
      )}

      {puedeBaja && l.estado === "Activo" && (
        <form action={darDeBajaLote} style={{ marginTop: 18, maxWidth: 720 }}>
          <input type="hidden" name="id" value={l.id} />
          <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>Dar de baja</b>
              <div className="page-sub">Baja lógica: pasa a Inactivo, nunca se elimina el histórico.</div>
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
