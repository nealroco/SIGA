"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/actions/beneficiarios";

type Acudiente = {
  nombres?: string | null;
  edad?: number | null;
  documento?: string | null;
  parentesco?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  ocupacion?: string | null;
};

type ContactoEmergencia = {
  nombres?: string | null;
  parentesco?: string | null;
  direccion?: string | null;
  telefono?: string | null;
};

type Values = {
  id?: number;
  documento?: string;
  nombre?: string;
  edad?: number | null;
  sexo?: string | null;
  programa?: string | null;
  territorioId?: number | null;

  primerNombre?: string | null;
  segundoNombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  genero?: string | null;
  tipoDocumento?: string | null;
  fechaExpedicionDoc?: string | null;
  lugarExpedicionDoc?: string | null;
  lugarNacimiento?: string | null;
  fechaNacimiento?: string | null;

  estaturaCm?: number | null;
  pesoKg?: number | null;
  tipoSangre?: string | null;
  talla?: string | null;

  direccionDomicilio?: string | null;
  ubicacionDomicilio?: string | null;
  estrato?: number | null;
  veredaCorregimiento?: string | null;
  nombreSede?: string | null;
  jornada?: string | null;

  grado?: string | null;
  descolarizado?: boolean;
  institucionEducativa?: string | null;
  secretariaEducacionCert?: string | null;
  nombreEstablecimiento?: string | null;
  nombreSedeEducativa?: string | null;
  codigoDaneSede?: string | null;
  codigoDaneMunicipio?: string | null;

  afiliacionSalud?: string | null;
  otroTipoAfiliacion?: string | null;
  eps?: string | null;
  consumeMedicamento?: boolean;
  cualMedicamento?: string | null;
  correoElectronico?: string | null;
  tieneConvulsiones?: boolean;
  tieneCardiovascular?: boolean;
  tieneRespiratoria?: boolean;
  tieneAlergias?: boolean;
  tieneEpilepsia?: boolean;
  tieneOtraEnfermedad?: boolean;
  cualOtraEnfermedad?: string | null;

  diagnosticadoDiscapacidad?: boolean;
  tieneRegistroLocalizacion?: boolean;
  discapacidadFisicoMotor?: boolean;
  discapacidadVisual?: boolean;
  discapacidadAuditiva?: boolean;
  discapacidadIntelectual?: boolean;
  discapacidadMultiple?: boolean;
  cualDiscapacidad?: string | null;
  recomendacionMedica?: string | null;

  tipoPoblacion?: string | null;
  cabildoResguardo?: string | null;
  otroTipoCondicionEspecial?: boolean;
  cualOtraCondicion?: string | null;
  victimaConflictoArmado?: boolean;
  registroUnicoVictimas?: boolean;
  numeroRuv?: string | null;

  acudiente?: Acudiente | null;
  contactoEmergencia?: ContactoEmergencia | null;

  docRegistroCivilOTi?: boolean;
  docCertificadoEpsAdres?: boolean;
  docCedulaAcudiente?: boolean;
  docConsentimientoAsentimiento?: boolean;
  docFichaInscripcion?: boolean;
  docAceptoPoliticaDatos?: boolean;

  cuentaConAlimentacion?: boolean;
  tipoComplementoAlimentario?: string | null;
  modalidadAlimentacion?: string | null;
  requiereAlimentacionCentro?: boolean;

  medioTransporte?: string | null;
  tiempoRecorrido?: string | null;
  requiereTransporteCentro?: boolean;
  requerimientoTransporte?: string | null;

  nombreFormador?: string | null;
  ccFormador?: string | null;
  tipoPoblacionFormador?: string | null;
  grupoCentroInteres?: string | null;
  observacionesRegistro?: string | null;
  fechaIngreso?: string | null;
  departamentoBeneficiario?: string | null;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

function Casilla({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <input id={name} name={name} type="checkbox" style={{ width: "auto" }} defaultChecked={!!defaultChecked} />
      <label htmlFor={name} style={{ marginBottom: 0 }}>{label}</label>
    </div>
  );
}

export default function BeneficiarioForm({
  action,
  values = {},
  submitLabel,
  territorios = [],
}: {
  action: Action;
  values?: Values;
  submitLabel: string;
  territorios?: { id: number; codigo: string; municipio: string; zona: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const d = (v?: string | null) => (v ? v.slice(0, 10) : "");
  const acu = values.acudiente ?? {};
  const ce = values.contactoEmergencia ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 24, maxWidth: 900 }}>
      {state.error && <div className="alert error">{state.error}</div>}
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <p className="section-cap">Identidad</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="documento">Documento <span className="req">*</span></label>
          <input id="documento" name="documento" className="input" defaultValue={values.documento ?? ""} required />
          {fe.documento && <span className="err">{fe.documento}</span>}
        </div>
        <div className="field">
          <label htmlFor="nombre">Nombre completo <span className="req">*</span></label>
          <input id="nombre" name="nombre" className="input" defaultValue={values.nombre ?? ""} required />
          {fe.nombre && <span className="err">{fe.nombre}</span>}
        </div>
        <div className="field">
          <label htmlFor="primerNombre">Primer nombre</label>
          <input id="primerNombre" name="primerNombre" className="input" defaultValue={values.primerNombre ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="segundoNombre">Segundo nombre</label>
          <input id="segundoNombre" name="segundoNombre" className="input" defaultValue={values.segundoNombre ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="primerApellido">Primer apellido</label>
          <input id="primerApellido" name="primerApellido" className="input" defaultValue={values.primerApellido ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="segundoApellido">Segundo apellido</label>
          <input id="segundoApellido" name="segundoApellido" className="input" defaultValue={values.segundoApellido ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="edad">Edad</label>
          <input id="edad" name="edad" className="input" type="number" min={0} max={120} defaultValue={values.edad ?? ""} />
          {fe.edad && <span className="err">{fe.edad}</span>}
        </div>
        <div className="field">
          <label htmlFor="sexo">Sexo</label>
          <select id="sexo" name="sexo" className="select" defaultValue={values.sexo ?? ""}>
            <option value="">—</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
          {fe.sexo && <span className="err">{fe.sexo}</span>}
        </div>
        <div className="field">
          <label htmlFor="genero">Género</label>
          <select id="genero" name="genero" className="select" defaultValue={values.genero ?? ""}>
            <option value="">—</option>
            <option value="Femenino">Femenino</option>
            <option value="Masculino">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="tipoDocumento">Tipo de documento</label>
          <select id="tipoDocumento" name="tipoDocumento" className="select" defaultValue={values.tipoDocumento ?? ""}>
            <option value="">—</option>
            {["TI", "RC", "CC", "CE", "PEP", "Otro"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fechaExpedicionDoc">Fecha expedición documento</label>
          <input id="fechaExpedicionDoc" name="fechaExpedicionDoc" className="input" type="date" defaultValue={d(values.fechaExpedicionDoc)} />
        </div>
        <div className="field">
          <label htmlFor="lugarExpedicionDoc">Lugar expedición documento</label>
          <input id="lugarExpedicionDoc" name="lugarExpedicionDoc" className="input" defaultValue={values.lugarExpedicionDoc ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="lugarNacimiento">Lugar de nacimiento</label>
          <input id="lugarNacimiento" name="lugarNacimiento" className="input" defaultValue={values.lugarNacimiento ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
          <input id="fechaNacimiento" name="fechaNacimiento" className="input" type="date" defaultValue={d(values.fechaNacimiento)} />
        </div>
        <div className="field">
          <label htmlFor="programa">Programa</label>
          <input id="programa" name="programa" className="input" defaultValue={values.programa ?? ""} placeholder="Escuela de fútbol…" />
        </div>
        <div className="field">
          <label htmlFor="territorioId">Territorio</label>
          <select id="territorioId" name="territorioId" className="select" defaultValue={values.territorioId ?? ""}>
            <option value="">—</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id}>{t.municipio}{t.zona ? ` — ${t.zona}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="section-cap">Datos físicos</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="estaturaCm">Estatura (cm)</label>
          <input id="estaturaCm" name="estaturaCm" className="input" type="number" min={0} max={250} defaultValue={values.estaturaCm ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="pesoKg">Peso (kg)</label>
          <input id="pesoKg" name="pesoKg" className="input" type="number" step="0.1" min={0} defaultValue={values.pesoKg ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="tipoSangre">Tipo de sangre</label>
          <select id="tipoSangre" name="tipoSangre" className="select" defaultValue={values.tipoSangre ?? ""}>
            <option value="">—</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="talla">Talla</label>
          <input id="talla" name="talla" className="input" defaultValue={values.talla ?? ""} placeholder="S, M, L…" />
        </div>
      </div>

      <p className="section-cap">Ubicación</p>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="direccionDomicilio">Dirección de domicilio</label>
          <textarea id="direccionDomicilio" name="direccionDomicilio" className="input" rows={2} defaultValue={values.direccionDomicilio ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ubicacionDomicilio">Ubicación de vivienda</label>
          <select id="ubicacionDomicilio" name="ubicacionDomicilio" className="select" defaultValue={values.ubicacionDomicilio ?? ""}>
            <option value="">—</option>
            <option value="Urbano">Urbano</option>
            <option value="Rural">Rural</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="estrato">Estrato</label>
          <select id="estrato" name="estrato" className="select" defaultValue={values.estrato ?? ""}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="veredaCorregimiento">Vereda / corregimiento</label>
          <input id="veredaCorregimiento" name="veredaCorregimiento" className="input" defaultValue={values.veredaCorregimiento ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="nombreSede">Nombre de sede (centro de interés)</label>
          <input id="nombreSede" name="nombreSede" className="input" defaultValue={values.nombreSede ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="jornada">Jornada</label>
          <select id="jornada" name="jornada" className="select" defaultValue={values.jornada ?? ""}>
            <option value="">—</option>
            <option value="Mañana">Mañana</option>
            <option value="Única">Única</option>
            <option value="Tarde">Tarde</option>
          </select>
        </div>
      </div>

      <p className="section-cap">Educación</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="grado">Grado</label>
          <input id="grado" name="grado" className="input" defaultValue={values.grado ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="institucionEducativa">Institución educativa</label>
          <input id="institucionEducativa" name="institucionEducativa" className="input" defaultValue={values.institucionEducativa ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="secretariaEducacionCert">Secretaría de educación certificada</label>
          <input id="secretariaEducacionCert" name="secretariaEducacionCert" className="input" defaultValue={values.secretariaEducacionCert ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="nombreEstablecimiento">Nombre del establecimiento</label>
          <input id="nombreEstablecimiento" name="nombreEstablecimiento" className="input" defaultValue={values.nombreEstablecimiento ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="nombreSedeEducativa">Nombre de sede educativa</label>
          <input id="nombreSedeEducativa" name="nombreSedeEducativa" className="input" defaultValue={values.nombreSedeEducativa ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="codigoDaneSede">Código DANE de sede</label>
          <input id="codigoDaneSede" name="codigoDaneSede" className="input" defaultValue={values.codigoDaneSede ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="codigoDaneMunicipio">Código DANE de municipio</label>
          <input id="codigoDaneMunicipio" name="codigoDaneMunicipio" className="input" defaultValue={values.codigoDaneMunicipio ?? ""} />
        </div>
        <Casilla name="descolarizado" label="Desescolarizado" defaultChecked={values.descolarizado} />
      </div>

      <p className="section-cap">Salud</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="afiliacionSalud">Afiliación a salud</label>
          <select id="afiliacionSalud" name="afiliacionSalud" className="select" defaultValue={values.afiliacionSalud ?? ""}>
            <option value="">—</option>
            <option value="Subsidiado">Subsidiado</option>
            <option value="Contributivo">Contributivo</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="otroTipoAfiliacion">Otro tipo de afiliación</label>
          <input id="otroTipoAfiliacion" name="otroTipoAfiliacion" className="input" defaultValue={values.otroTipoAfiliacion ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="eps">EPS</label>
          <input id="eps" name="eps" className="input" defaultValue={values.eps ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="correoElectronico">Correo electrónico</label>
          <input id="correoElectronico" name="correoElectronico" className="input" type="email" defaultValue={values.correoElectronico ?? ""} />
          {fe.correoElectronico && <span className="err">{fe.correoElectronico}</span>}
        </div>
        <Casilla name="consumeMedicamento" label="Consume medicamento" defaultChecked={values.consumeMedicamento} />
        <div className="field">
          <label htmlFor="cualMedicamento">¿Cuál medicamento?</label>
          <input id="cualMedicamento" name="cualMedicamento" className="input" defaultValue={values.cualMedicamento ?? ""} />
        </div>
        <Casilla name="tieneConvulsiones" label="Convulsiones" defaultChecked={values.tieneConvulsiones} />
        <Casilla name="tieneCardiovascular" label="Enfermedad cardiovascular" defaultChecked={values.tieneCardiovascular} />
        <Casilla name="tieneRespiratoria" label="Enfermedad respiratoria" defaultChecked={values.tieneRespiratoria} />
        <Casilla name="tieneAlergias" label="Alergias" defaultChecked={values.tieneAlergias} />
        <Casilla name="tieneEpilepsia" label="Epilepsia" defaultChecked={values.tieneEpilepsia} />
        <Casilla name="tieneOtraEnfermedad" label="Otra enfermedad" defaultChecked={values.tieneOtraEnfermedad} />
        <div className="field">
          <label htmlFor="cualOtraEnfermedad">¿Cuál otra enfermedad?</label>
          <input id="cualOtraEnfermedad" name="cualOtraEnfermedad" className="input" defaultValue={values.cualOtraEnfermedad ?? ""} />
        </div>
      </div>

      <p className="section-cap">Discapacidad</p>
      <div className="form-grid">
        <Casilla name="diagnosticadoDiscapacidad" label="Diagnosticado con discapacidad" defaultChecked={values.diagnosticadoDiscapacidad} />
        <Casilla name="tieneRegistroLocalizacion" label="Registro de localización y caracterización" defaultChecked={values.tieneRegistroLocalizacion} />
        <Casilla name="discapacidadFisicoMotor" label="Físico-motora" defaultChecked={values.discapacidadFisicoMotor} />
        <Casilla name="discapacidadVisual" label="Visual" defaultChecked={values.discapacidadVisual} />
        <Casilla name="discapacidadAuditiva" label="Auditiva" defaultChecked={values.discapacidadAuditiva} />
        <Casilla name="discapacidadIntelectual" label="Intelectual" defaultChecked={values.discapacidadIntelectual} />
        <Casilla name="discapacidadMultiple" label="Múltiple" defaultChecked={values.discapacidadMultiple} />
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="cualDiscapacidad">Detalle de la discapacidad</label>
          <textarea id="cualDiscapacidad" name="cualDiscapacidad" className="input" rows={2} defaultValue={values.cualDiscapacidad ?? ""} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="recomendacionMedica">Recomendación médica</label>
          <textarea id="recomendacionMedica" name="recomendacionMedica" className="input" rows={2} defaultValue={values.recomendacionMedica ?? ""} />
        </div>
      </div>

      <p className="section-cap">Población especial</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="tipoPoblacion">Tipo de población</label>
          <select id="tipoPoblacion" name="tipoPoblacion" className="select" defaultValue={values.tipoPoblacion ?? ""}>
            <option value="">—</option>
            {[
              "Ninguno",
              "Afro",
              "Campesino",
              "Indígena",
              "Otro",
              "Raizal",
              "Víctima del conflicto",
              "ROM",
              "Hijo de mujer lideresa",
            ].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cabildoResguardo">Cabildo / resguardo</label>
          <input id="cabildoResguardo" name="cabildoResguardo" className="input" defaultValue={values.cabildoResguardo ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="numeroRuv">Número RUV</label>
          <input id="numeroRuv" name="numeroRuv" className="input" defaultValue={values.numeroRuv ?? ""} />
        </div>
        <Casilla name="otroTipoCondicionEspecial" label="Otra condición especial" defaultChecked={values.otroTipoCondicionEspecial} />
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="cualOtraCondicion">¿Cuál otra condición?</label>
          <textarea id="cualOtraCondicion" name="cualOtraCondicion" className="input" rows={2} defaultValue={values.cualOtraCondicion ?? ""} />
        </div>
        <Casilla name="victimaConflictoArmado" label="Víctima del conflicto armado" defaultChecked={values.victimaConflictoArmado} />
        <Casilla name="registroUnicoVictimas" label="Registro Único de Víctimas (RUV)" defaultChecked={values.registroUnicoVictimas} />
      </div>

      <p className="section-cap">Acudiente</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="acu_nombres">Nombres</label>
          <input id="acu_nombres" name="acu_nombres" className="input" defaultValue={acu.nombres ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_edad">Edad</label>
          <input id="acu_edad" name="acu_edad" className="input" type="number" min={0} max={120} defaultValue={acu.edad ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_documento">Documento</label>
          <input id="acu_documento" name="acu_documento" className="input" defaultValue={acu.documento ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_parentesco">Parentesco</label>
          <input id="acu_parentesco" name="acu_parentesco" className="input" defaultValue={acu.parentesco ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_direccion">Dirección</label>
          <input id="acu_direccion" name="acu_direccion" className="input" defaultValue={acu.direccion ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_telefono">Teléfono</label>
          <input id="acu_telefono" name="acu_telefono" className="input" defaultValue={acu.telefono ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acu_correo">Correo</label>
          <input id="acu_correo" name="acu_correo" className="input" type="email" defaultValue={acu.correo ?? ""} />
          {fe["acudiente.correo"] && <span className="err">{fe["acudiente.correo"]}</span>}
        </div>
        <div className="field">
          <label htmlFor="acu_ocupacion">Ocupación</label>
          <input id="acu_ocupacion" name="acu_ocupacion" className="input" defaultValue={acu.ocupacion ?? ""} />
        </div>
      </div>

      <p className="section-cap">Contacto de emergencia</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ce_nombres">Nombres</label>
          <input id="ce_nombres" name="ce_nombres" className="input" defaultValue={ce.nombres ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ce_parentesco">Parentesco</label>
          <input id="ce_parentesco" name="ce_parentesco" className="input" defaultValue={ce.parentesco ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ce_direccion">Dirección</label>
          <input id="ce_direccion" name="ce_direccion" className="input" defaultValue={ce.direccion ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ce_telefono">Teléfono</label>
          <input id="ce_telefono" name="ce_telefono" className="input" defaultValue={ce.telefono ?? ""} />
        </div>
      </div>

      <p className="section-cap">Documentos anexos</p>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
        <Casilla name="docRegistroCivilOTi" label="Registro civil o tarjeta de identidad" defaultChecked={values.docRegistroCivilOTi} />
        <Casilla name="docCertificadoEpsAdres" label="Certificado EPS / ADRES" defaultChecked={values.docCertificadoEpsAdres} />
        <Casilla name="docCedulaAcudiente" label="Cédula del acudiente" defaultChecked={values.docCedulaAcudiente} />
        <Casilla name="docConsentimientoAsentimiento" label="Consentimiento / asentimiento informado" defaultChecked={values.docConsentimientoAsentimiento} />
        <Casilla name="docFichaInscripcion" label="Ficha de inscripción" defaultChecked={values.docFichaInscripcion} />
        <Casilla name="docAceptoPoliticaDatos" label="Aceptó política de tratamiento de datos" defaultChecked={values.docAceptoPoliticaDatos} />
      </div>

      <p className="section-cap">Alimentación</p>
      <div className="form-grid">
        <Casilla name="cuentaConAlimentacion" label="Cuenta con alimentación" defaultChecked={values.cuentaConAlimentacion} />
        <div className="field">
          <label htmlFor="tipoComplementoAlimentario">Tipo de complemento alimentario</label>
          <select id="tipoComplementoAlimentario" name="tipoComplementoAlimentario" className="select" defaultValue={values.tipoComplementoAlimentario ?? ""}>
            <option value="">—</option>
            <option value="Refrigerio">Refrigerio</option>
            <option value="Almuerzo">Almuerzo</option>
            <option value="N/A">N/A</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="modalidadAlimentacion">Modalidad de alimentación</label>
          <input id="modalidadAlimentacion" name="modalidadAlimentacion" className="input" defaultValue={values.modalidadAlimentacion ?? ""} />
        </div>
        <Casilla name="requiereAlimentacionCentro" label="Requiere alimentación en el centro" defaultChecked={values.requiereAlimentacionCentro} />
      </div>

      <p className="section-cap">Transporte</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="medioTransporte">Medio de transporte</label>
          <input id="medioTransporte" name="medioTransporte" className="input" defaultValue={values.medioTransporte ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="tiempoRecorrido">Tiempo de recorrido</label>
          <input id="tiempoRecorrido" name="tiempoRecorrido" className="input" defaultValue={values.tiempoRecorrido ?? ""} />
        </div>
        <Casilla name="requiereTransporteCentro" label="Requiere transporte al centro" defaultChecked={values.requiereTransporteCentro} />
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="requerimientoTransporte">Detalle del requerimiento de transporte</label>
          <textarea id="requerimientoTransporte" name="requerimientoTransporte" className="input" rows={2} defaultValue={values.requerimientoTransporte ?? ""} />
        </div>
      </div>

      <p className="section-cap">Meta / registro</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="nombreFormador">Nombre del formador</label>
          <input id="nombreFormador" name="nombreFormador" className="input" defaultValue={values.nombreFormador ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ccFormador">C.C. del formador</label>
          <input id="ccFormador" name="ccFormador" className="input" defaultValue={values.ccFormador ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="tipoPoblacionFormador">Tipo de población (formador)</label>
          <input id="tipoPoblacionFormador" name="tipoPoblacionFormador" className="input" defaultValue={values.tipoPoblacionFormador ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="grupoCentroInteres">Grupo / centro de interés</label>
          <input id="grupoCentroInteres" name="grupoCentroInteres" className="input" defaultValue={values.grupoCentroInteres ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="fechaIngreso">Fecha de ingreso</label>
          <input id="fechaIngreso" name="fechaIngreso" className="input" type="date" defaultValue={d(values.fechaIngreso)} />
        </div>
        <div className="field">
          <label htmlFor="departamentoBeneficiario">Departamento (registro)</label>
          <input id="departamentoBeneficiario" name="departamentoBeneficiario" className="input" defaultValue={values.departamentoBeneficiario ?? ""} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="observacionesRegistro">Observaciones de registro</label>
          <textarea id="observacionesRegistro" name="observacionesRegistro" className="input" rows={2} defaultValue={values.observacionesRegistro ?? ""} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href="/beneficiarios" className="btn">Cancelar</Link>
      </div>
    </form>
  );
}
