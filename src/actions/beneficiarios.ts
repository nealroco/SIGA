"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-001";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const optStr = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(max).optional());

const optText = () =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());

const optInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(min).max(max).optional()
  );

const optFloat = () =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().optional());

const optDate = () =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.date().optional());

// Un checkbox desmarcado no manda par clave-valor en FormData; readForm manda `null` para esos.
const bool = () => z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean());

const optEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(values).optional());

const acudienteSchema = z
  .object({
    nombres: optStr(150),
    edad: optInt(0, 120),
    documento: optStr(20),
    parentesco: optStr(60),
    direccion: optText(),
    telefono: optStr(30),
    correo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().email().optional()),
    ocupacion: optStr(120),
  })
  .optional();

const contactoEmergenciaSchema = z
  .object({
    nombres: optStr(150),
    parentesco: optStr(60),
    direccion: optText(),
    telefono: optStr(30),
  })
  .optional();

const schema = z.object({
  documento: z.string().trim().min(5, "Documento: mínimo 5 caracteres").max(20, "Documento demasiado largo"),
  nombre: z.string().trim().min(3, "Nombre requerido").max(120),
  // RN-020: la edad no puede ser negativa
  edad: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int("La edad debe ser un entero").min(0, "La edad no puede ser negativa").max(120, "Edad fuera de rango").optional()
  ),
  sexo: optEnum(["M", "F", "Otro"]),
  programa: optStr(120),
  territorioId: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive().optional()),

  // Identidad
  primerNombre: optStr(80),
  segundoNombre: optStr(80),
  primerApellido: optStr(80),
  segundoApellido: optStr(80),
  genero: optEnum(["Femenino", "Masculino", "Otro"]),
  tipoDocumento: optEnum(["TI", "RC", "CC", "CE", "PEP", "Otro"]),
  fechaExpedicionDoc: optDate(),
  lugarExpedicionDoc: optStr(120),
  lugarNacimiento: optStr(120),
  fechaNacimiento: optDate(),

  // Datos físicos
  estaturaCm: optInt(0, 250),
  pesoKg: optFloat(),
  tipoSangre: optEnum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]),
  talla: optStr(20),

  // Ubicación / domicilio
  direccionDomicilio: optText(),
  ubicacionDomicilio: optEnum(["Urbano", "Rural"]),
  estrato: optInt(1, 6),
  veredaCorregimiento: optStr(120),
  nombreSede: optStr(120),
  jornada: optEnum(["Mañana", "Única", "Tarde"]),

  // Educación
  grado: optStr(30),
  descolarizado: bool(),
  institucionEducativa: optStr(150),
  secretariaEducacionCert: optStr(150),
  nombreEstablecimiento: optStr(150),
  nombreSedeEducativa: optStr(150),
  codigoDaneSede: optStr(30),
  codigoDaneMunicipio: optStr(30),

  // Salud / afiliación
  afiliacionSalud: optEnum(["Subsidiado", "Contributivo", "Otro"]),
  otroTipoAfiliacion: optStr(120),
  eps: optStr(120),
  consumeMedicamento: bool(),
  cualMedicamento: optText(),
  correoElectronico: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().email().optional()),
  tieneConvulsiones: bool(),
  tieneCardiovascular: bool(),
  tieneRespiratoria: bool(),
  tieneAlergias: bool(),
  tieneEpilepsia: bool(),
  tieneOtraEnfermedad: bool(),
  cualOtraEnfermedad: optText(),

  // Discapacidad
  diagnosticadoDiscapacidad: bool(),
  tieneRegistroLocalizacion: bool(),
  discapacidadFisicoMotor: bool(),
  discapacidadVisual: bool(),
  discapacidadAuditiva: bool(),
  discapacidadIntelectual: bool(),
  discapacidadMultiple: bool(),
  cualDiscapacidad: optText(),
  recomendacionMedica: optText(),

  // Población especial
  tipoPoblacion: optEnum([
    "Ninguno",
    "Afro",
    "Campesino",
    "Indígena",
    "Otro",
    "Raizal",
    "Víctima del conflicto",
    "ROM",
    "Hijo de mujer lideresa",
  ]),
  cabildoResguardo: optStr(120),
  otroTipoCondicionEspecial: bool(),
  cualOtraCondicion: optText(),
  victimaConflictoArmado: bool(),
  registroUnicoVictimas: bool(),
  numeroRuv: optStr(30),

  // Documentos anexos
  docRegistroCivilOTi: bool(),
  docCertificadoEpsAdres: bool(),
  docCedulaAcudiente: bool(),
  docConsentimientoAsentimiento: bool(),
  docFichaInscripcion: bool(),
  docAceptoPoliticaDatos: bool(),

  // Alimentación
  cuentaConAlimentacion: bool(),
  tipoComplementoAlimentario: optEnum(["Refrigerio", "Almuerzo", "N/A"]),
  modalidadAlimentacion: optStr(80),
  requiereAlimentacionCentro: bool(),

  // Transporte
  medioTransporte: optStr(80),
  tiempoRecorrido: optStr(60),
  requiereTransporteCentro: bool(),
  requerimientoTransporte: optText(),

  // Meta / registro
  nombreFormador: optStr(120),
  ccFormador: optStr(20),
  tipoPoblacionFormador: optStr(80),
  grupoCentroInteres: optStr(120),
  observacionesRegistro: optText(),
  fechaIngreso: optDate(),
  departamentoBeneficiario: optStr(80),

  acudiente: acudienteSchema,
  contactoEmergencia: contactoEmergenciaSchema,
});

const FLAT_FIELDS = [
  "documento",
  "nombre",
  "edad",
  "sexo",
  "programa",
  "territorioId",
  "primerNombre",
  "segundoNombre",
  "primerApellido",
  "segundoApellido",
  "genero",
  "tipoDocumento",
  "fechaExpedicionDoc",
  "lugarExpedicionDoc",
  "lugarNacimiento",
  "fechaNacimiento",
  "estaturaCm",
  "pesoKg",
  "tipoSangre",
  "talla",
  "direccionDomicilio",
  "ubicacionDomicilio",
  "estrato",
  "veredaCorregimiento",
  "nombreSede",
  "jornada",
  "grado",
  "descolarizado",
  "institucionEducativa",
  "secretariaEducacionCert",
  "nombreEstablecimiento",
  "nombreSedeEducativa",
  "codigoDaneSede",
  "codigoDaneMunicipio",
  "afiliacionSalud",
  "otroTipoAfiliacion",
  "eps",
  "consumeMedicamento",
  "cualMedicamento",
  "correoElectronico",
  "tieneConvulsiones",
  "tieneCardiovascular",
  "tieneRespiratoria",
  "tieneAlergias",
  "tieneEpilepsia",
  "tieneOtraEnfermedad",
  "cualOtraEnfermedad",
  "diagnosticadoDiscapacidad",
  "tieneRegistroLocalizacion",
  "discapacidadFisicoMotor",
  "discapacidadVisual",
  "discapacidadAuditiva",
  "discapacidadIntelectual",
  "discapacidadMultiple",
  "cualDiscapacidad",
  "recomendacionMedica",
  "tipoPoblacion",
  "cabildoResguardo",
  "otroTipoCondicionEspecial",
  "cualOtraCondicion",
  "victimaConflictoArmado",
  "registroUnicoVictimas",
  "numeroRuv",
  "docRegistroCivilOTi",
  "docCertificadoEpsAdres",
  "docCedulaAcudiente",
  "docConsentimientoAsentimiento",
  "docFichaInscripcion",
  "docAceptoPoliticaDatos",
  "cuentaConAlimentacion",
  "tipoComplementoAlimentario",
  "modalidadAlimentacion",
  "requiereAlimentacionCentro",
  "medioTransporte",
  "tiempoRecorrido",
  "requiereTransporteCentro",
  "requerimientoTransporte",
  "nombreFormador",
  "ccFormador",
  "tipoPoblacionFormador",
  "grupoCentroInteres",
  "observacionesRegistro",
  "fechaIngreso",
  "departamentoBeneficiario",
] as const;

function readForm(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const key of FLAT_FIELDS) out[key] = fd.get(key);

  out.acudiente = {
    nombres: fd.get("acu_nombres"),
    edad: fd.get("acu_edad"),
    documento: fd.get("acu_documento"),
    parentesco: fd.get("acu_parentesco"),
    direccion: fd.get("acu_direccion"),
    telefono: fd.get("acu_telefono"),
    correo: fd.get("acu_correo"),
    ocupacion: fd.get("acu_ocupacion"),
  };
  out.contactoEmergencia = {
    nombres: fd.get("ce_nombres"),
    parentesco: fd.get("ce_parentesco"),
    direccion: fd.get("ce_direccion"),
    telefono: fd.get("ce_telefono"),
  };

  return out;
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function crearBeneficiario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  // RN-015: el permiso de rol prevalece (verificación en servidor)
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Beneficiarios (MOD-001).` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { acudiente, contactoEmergencia, ...data } = parsed.data;

  const dup = await prisma.beneficiario.findUnique({ where: { documento: data.documento }, select: { id: true } });
  if (dup) return { fieldErrors: { documento: "Ya existe un beneficiario con ese documento." } };

  const creado = await prisma.beneficiario.create({
    data: {
      ...data,
      acudiente: acudiente?.nombres ? { create: { ...acudiente, nombres: acudiente.nombres } } : undefined,
      contactoEmergencia: contactoEmergencia?.nombres
        ? { create: { ...contactoEmergencia, nombres: contactoEmergencia.nombres } }
        : undefined,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { documento: data.documento, nombre: data.nombre, programa: data.programa, estado: "Activo" },
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}

export async function editarBeneficiario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Beneficiarios (MOD-001).` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Registro no válido." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { acudiente, contactoEmergencia, ...data } = parsed.data;

  const anterior = await prisma.beneficiario.findUnique({ where: { id } });
  if (!anterior) return { error: "El beneficiario no existe." };

  const dup = await prisma.beneficiario.findUnique({ where: { documento: data.documento }, select: { id: true } });
  if (dup && dup.id !== id) return { fieldErrors: { documento: "Otro beneficiario ya usa ese documento." } };

  await prisma.beneficiario.update({
    where: { id },
    data: {
      ...data,
      // Si `nombres` viene vacío en una edición con acudiente/contacto ya existente, no se toca
      // la relación (no se borra) — comportamiento conservador, "permitir borrar" queda fuera de alcance.
      acudiente: acudiente?.nombres
        ? { upsert: { create: { ...acudiente, nombres: acudiente.nombres }, update: acudiente } }
        : undefined,
      contactoEmergencia: contactoEmergencia?.nombres
        ? { upsert: { create: { ...contactoEmergencia, nombres: contactoEmergencia.nombres }, update: contactoEmergencia } }
        : undefined,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: {
      documento: anterior.documento,
      nombre: anterior.nombre,
      edad: anterior.edad,
      programa: anterior.programa,
    },
    valorNuevo: { documento: data.documento, nombre: data.nombre, edad: data.edad, programa: data.programa },
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}

// RN-002: la "eliminación" es baja lógica (estado = Inactivo), nunca DELETE físico.
export async function darDeBajaBeneficiario(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error("No autorizado para dar de baja beneficiarios.");
  }
  const id = Number(fd.get("id"));
  if (!id) return;

  const anterior = await prisma.beneficiario.findUnique({ where: { id } });
  if (!anterior || anterior.estado === "Inactivo") {
    revalidatePath("/beneficiarios");
    redirect("/beneficiarios");
  }

  await prisma.beneficiario.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}
