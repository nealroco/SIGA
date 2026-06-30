import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { crearDocumento } from "@/actions/documental";
import DocumentoForm from "@/components/DocumentoForm";

export const dynamic = "force-dynamic";

export default async function NuevoDocumentoPage() {
  const session = await auth();
  const puedeCrear = session ? await can(session.user.rol, "MOD-005", "editar") : false;
  const contratos = await prisma.contrato.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true } });

  return (
    <div>
      <h1 className="page-title">Nuevo documento</h1>
      <p className="page-sub">MOD-005 · agrega un documento al expediente de un contrato (RN-017).</p>

      {!puedeCrear ? (
        <div className="alert info" style={{ marginTop: 18, maxWidth: 720 }}>
          Registrar documentos requiere <b>escritura (E)</b> en MOD-005. Tu rol (<b>{session?.user.rol}</b>) no puede registrar (RN-015).{" "}
          <Link href="/documental">Volver</Link>.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <DocumentoForm action={crearDocumento} contratos={contratos} submitLabel="Crear documento" />
        </div>
      )}
    </div>
  );
}
