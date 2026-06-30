import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ModuloPlaceholder({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const modulo = await prisma.modulo.findUnique({ where: { codigo: decodeURIComponent(codigo) } });
  if (!modulo) notFound();

  return (
    <div>
      <h1 className="page-title">{modulo.nombre}</h1>
      <p className="page-sub">
        <span className="mono">{modulo.codigo}</span> · {modulo.categoria}
        {modulo.esBase ? " · módulo base" : ""}
      </p>

      <div className="card" style={{ padding: 28, marginTop: 22, maxWidth: 720 }}>
        <p className="section-cap">En construcción</p>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Este módulo aún no está implementado. El primer entregable cubre el <b>esqueleto</b> (IAM, navegación,
          modelo de datos, matriz de permisos) y el módulo <b>Beneficiarios (MOD-001)</b> end-to-end como patrón.
          Los demás módulos se construyen replicando ese mismo patrón: modelo Prisma → server actions con{" "}
          <span className="mono">can()</span> + auditoría → páginas con la identidad SIGA.
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <Link href="/beneficiarios" className="btn btn-blue">Ver el patrón (Beneficiarios) →</Link>
          <Link href="/admin/permisos" className="btn">Ver permisos del módulo</Link>
        </div>
      </div>
    </div>
  );
}
