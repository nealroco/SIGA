import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearEntrega } from "@/actions/dotacion";
import DotacionForm from "@/components/DotacionForm";

export const dynamic = "force-dynamic";

export default async function NuevaEntregaPage() {
  const session = await auth();
  const puedeCrear = session
    ? (await can(session.user.rol, "MOD-013", "crear")) || (await can(session.user.rol, "MOD-013", "cargar"))
    : false;
  const beneficiarios = await prisma.beneficiario.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, documento: true },
  });
  const items = await prisma.item.findMany({
    where: { estado: "Activo" },
    orderBy: { nombre: "asc" },
    select: { id: true, codigo: true, nombre: true, cantidad: true },
  });

  return (
    <div>
      <h1 className="page-title">Nueva entrega de dotación</h1>
      <p className="page-sub">MOD-013 · descuenta el stock del ítem entregado.</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar entregas requiere <b>escritura (E)</b> o <b>carga (C)</b> en MOD-013. Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015). <Link href="/dotacion">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <DotacionForm action={crearEntrega} beneficiarios={beneficiarios} items={items} submitLabel="Registrar entrega" />
        </div>
      )}
    </div>
  );
}
