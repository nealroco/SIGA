import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { editarBeneficiario, darDeBajaBeneficiario } from "@/actions/beneficiarios";
import BeneficiarioForm from "@/components/BeneficiarioForm";
import MapaUbicacion from "@/components/maps/MapaUbicacion";

export const dynamic = "force-dynamic";

export default async function BeneficiarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-001", "ver"))) redirect("/beneficiarios");

  const { id } = await params;
  const beneficiarioId = Number(id);
  if (!beneficiarioId) notFound();

  const b = await prisma.beneficiario.findUnique({
    where: { id: beneficiarioId },
    include: { territorio: true, acudiente: true, contactoEmergencia: true },
  });
  if (!b) notFound();

  const puedeEditar = await can(session.user.rol, "MOD-001", "editar");
  const puedeBaja = await can(session.user.rol, "MOD-001", "eliminar");
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

      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <p className="section-cap">Ubicación</p>
        <MapaUbicacion lat={b.territorio?.lat} lng={b.territorio?.lng} label={b.territorio?.municipio ?? b.nombre} height={200} />
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

              primerNombre: b.primerNombre,
              segundoNombre: b.segundoNombre,
              primerApellido: b.primerApellido,
              segundoApellido: b.segundoApellido,
              genero: b.genero,
              tipoDocumento: b.tipoDocumento,
              fechaExpedicionDoc: b.fechaExpedicionDoc ? b.fechaExpedicionDoc.toISOString() : null,
              lugarExpedicionDoc: b.lugarExpedicionDoc,
              lugarNacimiento: b.lugarNacimiento,
              fechaNacimiento: b.fechaNacimiento ? b.fechaNacimiento.toISOString() : null,

              estaturaCm: b.estaturaCm,
              pesoKg: b.pesoKg,
              tipoSangre: b.tipoSangre,
              talla: b.talla,

              direccionDomicilio: b.direccionDomicilio,
              ubicacionDomicilio: b.ubicacionDomicilio,
              estrato: b.estrato,
              veredaCorregimiento: b.veredaCorregimiento,
              nombreSede: b.nombreSede,
              jornada: b.jornada,

              grado: b.grado,
              descolarizado: b.descolarizado,
              institucionEducativa: b.institucionEducativa,
              secretariaEducacionCert: b.secretariaEducacionCert,
              nombreEstablecimiento: b.nombreEstablecimiento,
              nombreSedeEducativa: b.nombreSedeEducativa,
              codigoDaneSede: b.codigoDaneSede,
              codigoDaneMunicipio: b.codigoDaneMunicipio,

              afiliacionSalud: b.afiliacionSalud,
              otroTipoAfiliacion: b.otroTipoAfiliacion,
              eps: b.eps,
              consumeMedicamento: b.consumeMedicamento,
              cualMedicamento: b.cualMedicamento,
              correoElectronico: b.correoElectronico,
              tieneConvulsiones: b.tieneConvulsiones,
              tieneCardiovascular: b.tieneCardiovascular,
              tieneRespiratoria: b.tieneRespiratoria,
              tieneAlergias: b.tieneAlergias,
              tieneEpilepsia: b.tieneEpilepsia,
              tieneOtraEnfermedad: b.tieneOtraEnfermedad,
              cualOtraEnfermedad: b.cualOtraEnfermedad,

              diagnosticadoDiscapacidad: b.diagnosticadoDiscapacidad,
              tieneRegistroLocalizacion: b.tieneRegistroLocalizacion,
              discapacidadFisicoMotor: b.discapacidadFisicoMotor,
              discapacidadVisual: b.discapacidadVisual,
              discapacidadAuditiva: b.discapacidadAuditiva,
              discapacidadIntelectual: b.discapacidadIntelectual,
              discapacidadMultiple: b.discapacidadMultiple,
              cualDiscapacidad: b.cualDiscapacidad,
              recomendacionMedica: b.recomendacionMedica,

              tipoPoblacion: b.tipoPoblacion,
              cabildoResguardo: b.cabildoResguardo,
              otroTipoCondicionEspecial: b.otroTipoCondicionEspecial,
              cualOtraCondicion: b.cualOtraCondicion,
              victimaConflictoArmado: b.victimaConflictoArmado,
              registroUnicoVictimas: b.registroUnicoVictimas,
              numeroRuv: b.numeroRuv,

              acudiente: b.acudiente,
              contactoEmergencia: b.contactoEmergencia,

              docRegistroCivilOTi: b.docRegistroCivilOTi,
              docCertificadoEpsAdres: b.docCertificadoEpsAdres,
              docCedulaAcudiente: b.docCedulaAcudiente,
              docConsentimientoAsentimiento: b.docConsentimientoAsentimiento,
              docFichaInscripcion: b.docFichaInscripcion,
              docAceptoPoliticaDatos: b.docAceptoPoliticaDatos,

              cuentaConAlimentacion: b.cuentaConAlimentacion,
              tipoComplementoAlimentario: b.tipoComplementoAlimentario,
              modalidadAlimentacion: b.modalidadAlimentacion,
              requiereAlimentacionCentro: b.requiereAlimentacionCentro,

              medioTransporte: b.medioTransporte,
              tiempoRecorrido: b.tiempoRecorrido,
              requiereTransporteCentro: b.requiereTransporteCentro,
              requerimientoTransporte: b.requerimientoTransporte,

              nombreFormador: b.nombreFormador,
              ccFormador: b.ccFormador,
              tipoPoblacionFormador: b.tipoPoblacionFormador,
              grupoCentroInteres: b.grupoCentroInteres,
              observacionesRegistro: b.observacionesRegistro,
              fechaIngreso: b.fechaIngreso ? b.fechaIngreso.toISOString() : null,
              departamentoBeneficiario: b.departamentoBeneficiario,
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
