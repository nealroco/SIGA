"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-008";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  nombre: z.string().trim().min(4, "Nombre requerido").max(160),
  tipo: z.preprocess((v) => (v === "" || v == null ? "Beneficiarios" : v), z.string().max(60)),
  descripcion: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(400).optional()),
  cupos: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0, "Cupos no puede ser negativo")),
  fechaApertura: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  fechaCierre: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
});

function readForm(fd: FormData) {
  return {
    nombre: String(fd.get("nombre") ?? ""),
    tipo: fd.get("tipo"),
    descripcion: String(fd.get("descripcion") ?? ""),
    cupos: fd.get("cupos"),
    fechaApertura: fd.get("fechaApertura"),
    fechaCierre: fd.get("fechaCierre"),
  };
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const toDate = (v?: string) => (v ? (isNaN(new Date(v).getTime()) ? null : new Date(v)) : null);

export async function crearConvocatoria(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  // RN-027: crear/seleccionar en convocatorias requiere escritura (E) — rol Supervisor
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: gestionar convocatorias requiere escritura (E) en MOD-008 (rol Supervisor). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const apertura = toDate(d.fechaApertura);
  const cierre = toDate(d.fechaCierre);
  if (apertura && cierre && cierre <= apertura)
    return { fieldErrors: { fechaCierre: "La fecha de cierre debe ser posterior a la de apertura." } };

  const creada = await prisma.convocatoria.create({
    data: {
      nombre: d.nombre,
      tipo: d.tipo,
      descripcion: d.descripcion,
      cupos: d.cupos,
      fechaApertura: apertura,
      fechaCierre: cierre,
      estado: "Abierta",
      createdById: Number(session.user.id),
    },
  });
  // Comunicaciones y Convocatorias: al crear la convocatoria se deja listo un borrador
  // de comunicación interna anunciando la apertura, pendiente de redacción final.
  await prisma.comunicacion.create({
    data: {
      tipo: "Interna",
      canal: "Correo",
      asunto: `Apertura de convocatoria ${d.nombre}`,
      contenido: `Se abre la convocatoria "${d.nombre}" con ${d.cupos} cupo(s) disponibles. Este es un borrador automático, pendiente de redacción final antes de enviar.`,
      publico: "Coordinadores territoriales",
      convocatoriaId: creada.id,
      estado: "Borrador",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { nombre: d.nombre, cupos: d.cupos } });
  revalidatePath("/convocatorias");
  redirect("/convocatorias");
}

export async function editarConvocatoria(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar convocatorias requiere escritura (E) en MOD-008. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Convocatoria no válida." };
  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const apertura = toDate(d.fechaApertura);
  const cierre = toDate(d.fechaCierre);
  if (apertura && cierre && cierre <= apertura)
    return { fieldErrors: { fechaCierre: "La fecha de cierre debe ser posterior a la de apertura." } };

  await prisma.convocatoria.update({
    where: { id },
    data: {
      nombre: d.nombre,
      tipo: d.tipo,
      descripcion: d.descripcion,
      cupos: d.cupos,
      fechaApertura: apertura,
      fechaCierre: cierre,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { nombre: d.nombre, cupos: d.cupos } });
  revalidatePath("/convocatorias");
  redirect("/convocatorias");
}

// RN-027: la selección la propone quien tiene E (Supervisor), NO la Coord. deportiva
export async function proponerBeneficiario(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "crear")))
    throw new Error(`No autorizado: proponer beneficiarios en convocatorias requiere escritura (E) en MOD-008 (rol Supervisor). Tu rol es ${session.user.rol}.`);

  const convocatoriaId = Number(fd.get("convocatoriaId"));
  const beneficiarioId = Number(fd.get("beneficiarioId"));
  if (!convocatoriaId || !beneficiarioId) redirect(`/convocatorias/${convocatoriaId}`);

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: beneficiarioId } });
  if (!beneficiario || beneficiario.estado !== "Activo")
    throw new Error("El beneficiario propuesto no existe o no está Activo.");

  const ya = await prisma.seleccionBeneficiario.findUnique({
    where: { convocatoriaId_beneficiarioId: { convocatoriaId, beneficiarioId } },
  });
  if (!ya) {
    await prisma.seleccionBeneficiario.create({
      data: { convocatoriaId, beneficiarioId, estado: "Propuesto", propuestoById: Number(session.user.id) },
    });
    await writeAudit({ usuarioId: Number(session.user.id), accion: "proponer", modulo: MOD, registroId: convocatoriaId, valorNuevo: { beneficiarioId } });
  }
  revalidatePath(`/convocatorias/${convocatoriaId}`);
  redirect(`/convocatorias/${convocatoriaId}`);
}

// RN-027: la aprobación de la selección es del Administrador (nivel A), distinto de quien propuso
export async function aprobarSeleccion(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar la selección requiere nivel Aprobación (A) en MOD-008 (rol Administrador). Tu rol es ${session.user.rol}.`);

  const seleccionId = Number(fd.get("seleccionId"));
  const sel = await prisma.seleccionBeneficiario.findUnique({ where: { id: seleccionId }, include: { convocatoria: true } });
  if (!sel) redirect("/convocatorias");
  if (sel.estado !== "Propuesto") redirect(`/convocatorias/${sel.convocatoriaId}`);
  if (sel.propuestoById && sel.propuestoById === Number(session.user.id))
    throw new Error("Segregación (RN-027): no puedes aprobar una selección que tú mismo propusiste.");

  // respeta los cupos de la convocatoria
  const aprobados = await prisma.seleccionBeneficiario.count({ where: { convocatoriaId: sel.convocatoriaId, estado: "Aprobado" } });
  if (sel.convocatoria.cupos > 0 && aprobados >= sel.convocatoria.cupos)
    throw new Error(`No hay cupos disponibles: la convocatoria admite ${sel.convocatoria.cupos}.`);

  await prisma.seleccionBeneficiario.update({ where: { id: seleccionId }, data: { estado: "Aprobado", aprobadoById: Number(session.user.id) } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: sel.convocatoriaId, valorNuevo: { seleccionId, estado: "Aprobado" } });

  // Convocatorias y Seguimiento: cierre automático del ciclo de vida cuando se completan los cupos.
  const aprobadosAhora = await prisma.seleccionBeneficiario.count({ where: { convocatoriaId: sel.convocatoriaId, estado: "Aprobado" } });
  if (sel.convocatoria.cupos > 0 && aprobadosAhora >= sel.convocatoria.cupos) {
    await prisma.convocatoria.update({ where: { id: sel.convocatoriaId }, data: { estado: "Cerrada" } });
    await writeAudit({ usuarioId: Number(session.user.id), accion: "cierre_automatico_cupos", modulo: MOD, registroId: sel.convocatoriaId, valorNuevo: { estado: "Cerrada" } });
  }

  revalidatePath(`/convocatorias/${sel.convocatoriaId}`);
  redirect(`/convocatorias/${sel.convocatoriaId}`);
}

export async function rechazarSeleccion(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-008.`);

  const seleccionId = Number(fd.get("seleccionId"));
  const sel = await prisma.seleccionBeneficiario.findUnique({ where: { id: seleccionId } });
  if (!sel) redirect("/convocatorias");
  if (sel.estado !== "Propuesto") redirect(`/convocatorias/${sel.convocatoriaId}`);

  await prisma.seleccionBeneficiario.update({ where: { id: seleccionId }, data: { estado: "Rechazado", aprobadoById: Number(session.user.id) } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: sel.convocatoriaId, valorNuevo: { seleccionId, estado: "Rechazado" } });
  revalidatePath(`/convocatorias/${sel.convocatoriaId}`);
  redirect(`/convocatorias/${sel.convocatoriaId}`);
}

// Convocatorias y Seguimiento: cierre de ciclo de vida — decisión de nivel Aprobación (A)
export async function cerrarConvocatoria(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: cerrar convocatorias requiere nivel Aprobación (A) en MOD-008.`);

  const id = Number(fd.get("id"));
  const c = await prisma.convocatoria.findUnique({ where: { id } });
  if (!c || c.estado === "Cerrada") {
    redirect(`/convocatorias/${id}`);
  }

  await prisma.convocatoria.update({ where: { id }, data: { estado: "Cerrada" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "cerrar", modulo: MOD, registroId: id, valorAnterior: { estado: c!.estado }, valorNuevo: { estado: "Cerrada" } });
  revalidatePath("/convocatorias");
  redirect(`/convocatorias/${id}`);
}
