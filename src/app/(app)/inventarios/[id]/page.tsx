import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarItem, darDeBajaItem } from "@/actions/inventarios";
import ItemForm from "@/components/ItemForm";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = { Activo: "ok", Inactivo: "off" };

export default async function ItemDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!itemId) notFound();

  const it = await prisma.item.findUnique({ where: { id: itemId }, include: { createdBy: true } });
  if (!it) notFound();

  const session = await auth();
  const rol = session!.user.rol;
  const puedeEditar = await can(rol, "MOD-004", "editar");
  const puedeEliminar = (await can(rol, "MOD-004", "eliminar")) && it.estado === "Activo";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">{it.codigo}</h1>
          <p className="page-sub">
            MOD-004 · <span className={`badge ${ESTADO_BADGE[it.estado] ?? "off"}`}>{it.estado}</span> · {it.nombre}
          </p>
        </div>
        <Link href="/inventarios" className="btn">← Volver</Link>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18, maxWidth: 760 }}>
        <p className="section-cap">Detalle</p>
        <div className="form-grid" style={{ gap: "10px 18px" }}>
          <div><b>Nombre:</b> {it.nombre}</div>
          <div><b>Categoría:</b> {it.categoria ?? "—"}</div>
          <div><b>Ubicación:</b> {it.ubicacion ?? "—"}</div>
          <div><b>Cantidad:</b> <span className="mono">{it.cantidad}</span></div>
          <div><b>Registrado por:</b> {it.createdBy?.nombre ?? "—"}</div>
        </div>
      </div>

      {puedeEliminar && (
        <form action={darDeBajaItem} className="card" style={{ padding: 18, marginTop: 18, maxWidth: 760, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <input type="hidden" name="id" value={it.id} />
          <div>
            <b>Dar de baja</b>
            <div className="page-sub">Baja lógica del ítem (RN-002): pasa a estado Inactivo, no se elimina el registro.</div>
          </div>
          <button className="btn" type="submit" style={{ borderColor: "var(--coral)", color: "var(--coral)" }}>Dar de baja</button>
        </form>
      )}

      {puedeEditar ? (
        <div style={{ marginTop: 18 }}>
          <p className="section-cap">Editar</p>
          <ItemForm
            action={editarItem}
            submitLabel="Guardar cambios"
            values={{
              id: it.id,
              codigo: it.codigo,
              nombre: it.nombre,
              categoria: it.categoria,
              ubicacion: it.ubicacion,
              cantidad: it.cantidad,
            }}
          />
        </div>
      ) : (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Vista de solo lectura para tu rol (<b>{rol}</b>). Editar requiere escritura (E) en MOD-004 — RN-015.
        </div>
      )}
    </div>
  );
}
