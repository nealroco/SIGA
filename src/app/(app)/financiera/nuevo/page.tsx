import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearCuenta } from "@/actions/financiera";
import CuentaForm from "@/components/CuentaForm";

export const dynamic = "force-dynamic";

export default async function NuevaCuentaPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-003", "crear") : false;
  const [contratos, rubros] = await Promise.all([
    prisma.contrato.findMany({ where: { estado: "Aprobado" }, orderBy: { numero: "asc" } }),
    prisma.rubro.findMany({ where: { estado: "Aprobado" }, orderBy: { codigo: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="page-title">Nueva cuenta de cobro</h1>
      <p className="page-sub">
        MOD-003 · la cuenta quedará pendiente de aprobación (RN-025). RN-005: requiere un contrato Aprobado.
        RN-007: el rubro debe tener su meta de inversión Aprobada (ver <Link href="/rubros" className="mono" style={{ color: "var(--blue)" }}>Rubros →</Link>).
      </p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 760 }}>
          Registrar cuentas de cobro requiere <b>escritura (E)</b> en MOD-003 (rol <b>Financiera</b>). Tu rol (<b>{session?.user.rol}</b>)
          no puede registrar (RN-015/RN-025). <Link href="/financiera">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <CuentaForm action={crearCuenta} contratos={contratos} rubros={rubros} submitLabel="Registrar cuenta" />
        </div>
      )}
    </div>
  );
}
