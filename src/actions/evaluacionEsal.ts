"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-009";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  terceroId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un tercero")),
  convocatoriaId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  criterio: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(400).optional()),
  puntaje: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0, "El puntaje no puede ser negativo").max(100, "El puntaje no puede superar 100").optional()
  ),
});

function readForm(fd: FormData) {
  return {
    terceroId: fd.get("terceroId"),
    convocatoriaId: fd.get("convocatoriaId"),
    criterio: fd.get("criterio"),
    puntaje: fd.get("puntaje"),
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

export async function crearEvaluacion(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar evaluaciones ESAL requiere escritura (E) en MOD-009 (rol Administrador). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const tercero = await prisma.tercero.findUnique({ where: { id: d.terceroId } });
  if (!tercero) return { fieldErrors: { terceroId: "El tercero seleccionado no existe." } };

  if (d.convocatoriaId != null) {
    const convocatoria = await prisma.convocatoria.findUnique({ where: { id: d.convocatoriaId } });
    if (!convocatoria) return { fieldErrors: { convocatoriaId: "La convocatoria seleccionada no existe." } };
  }

  const creada = await prisma.evaluacionEsal.create({
    data: {
      terceroId: d.terceroId,
      convocatoriaId: d.convocatoriaId ?? null,
      criterio: d.criterio ?? null,
      puntaje: d.puntaje ?? null,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { terceroId: d.terceroId, convocatoriaId: d.convocatoriaId ?? null, puntaje: d.puntaje ?? null, estado: "Registrada" } });
  // RN-025: doble control — notificar al aprobador que hay una evaluación ESAL pendiente de aprobación
  await prisma.notificacion.create({
    data: {
      tipoEvento: "RN-025",
      canal: "Sistema",
      destinatario: "Supervisor",
      mensaje: `La evaluación ESAL #${creada.id} del tercero #${d.terceroId} (${tercero.razonSocial}) quedó pendiente de aprobación.`,
      estadoEnvio: "Pendiente",
      createdById: Number(session.user.id),
    },
  });
  revalidatePath("/evaluacion-esal");
  redirect("/evaluacion-esal");
}

export async function editarEvaluacion(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar evaluaciones ESAL requiere escritura (E) en MOD-009. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Evaluación no válida." };
  const actual = await prisma.evaluacionEsal.findUnique({ where: { id } });
  if (!actual) return { error: "La evaluación no existe." };
  if (actual.estado !== "Registrada" && actual.estado !== "Rechazada")
    return { error: "Solo se pueden editar evaluaciones en estado Registrada o Rechazada." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const tercero = await prisma.tercero.findUnique({ where: { id: d.terceroId } });
  if (!tercero) return { fieldErrors: { terceroId: "El tercero seleccionado no existe." } };

  if (d.convocatoriaId != null) {
    const convocatoria = await prisma.convocatoria.findUnique({ where: { id: d.convocatoriaId } });
    if (!convocatoria) return { fieldErrors: { convocatoriaId: "La convocatoria seleccionada no existe." } };
  }

  await prisma.evaluacionEsal.update({
    where: { id },
    data: {
      terceroId: d.terceroId,
      convocatoriaId: d.convocatoriaId ?? null,
      criterio: d.criterio ?? null,
      puntaje: d.puntaje ?? null,
      estado: "Registrada", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { terceroId: d.terceroId, convocatoriaId: d.convocatoriaId ?? null, puntaje: d.puntaje ?? null } });
  revalidatePath("/evaluacion-esal");
  redirect("/evaluacion-esal");
}

// RN-025-style: solo un rol con Aprobación (A) puede aprobar, y nunca quien lo registró (4 ojos)
export async function aprobarEvaluacion(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar evaluaciones ESAL requiere nivel Aprobación (A) en MOD-009 (rol Supervisor). Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const ev = await prisma.evaluacionEsal.findUnique({ where: { id } });
  if (!ev || ev.estado !== "Registrada") {
    revalidatePath(`/evaluacion-esal/${id}`);
    redirect(`/evaluacion-esal/${id}`);
  }
  if (ev.createdById && ev.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar una evaluación que tú registraste.");

  await prisma.evaluacionEsal.update({
    where: { id },
    data: { estado: "Aprobada", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrada" }, valorNuevo: { estado: "Aprobada" } });
  revalidatePath("/evaluacion-esal");
  redirect(`/evaluacion-esal/${id}`);
}

export async function rechazarEvaluacion(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-009.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");
  const ev = await prisma.evaluacionEsal.findUnique({ where: { id } });
  if (!ev || ev.estado !== "Registrada") {
    redirect(`/evaluacion-esal/${id}`);
  }

  await prisma.evaluacionEsal.update({ where: { id }, data: { estado: "Rechazada", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazada", motivo } });
  revalidatePath("/evaluacion-esal");
  redirect(`/evaluacion-esal/${id}`);
}
