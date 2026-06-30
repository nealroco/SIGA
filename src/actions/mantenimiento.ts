"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-023";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const TIPOS = ["Programado", "Correctivo", "Emergencia"] as const;

const schema = z.object({
  escenarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un escenario")),
  tipo: z.enum(TIPOS, { message: "Tipo no válido" }),
  descripcion: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(500).optional()),
  fechaInicio: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  fechaFin: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  // RN-020: los valores monetarios no pueden ser negativos
  costo: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El costo no puede ser negativo")
  ),
});

function readForm(fd: FormData) {
  return {
    escenarioId: fd.get("escenarioId"),
    tipo: String(fd.get("tipo") ?? ""),
    descripcion: fd.get("descripcion"),
    fechaInicio: fd.get("fechaInicio"),
    fechaFin: fd.get("fechaFin"),
    costo: fd.get("costo"),
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

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function crearMantenimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar mantenimientos requiere escritura (E) en MOD-023 (roles Administrador / Infraestructura). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const ini = toDate(d.fechaInicio);
  const fin = toDate(d.fechaFin);
  if (ini && fin && fin < ini) return { fieldErrors: { fechaFin: "La fecha fin no puede ser anterior a la de inicio." } };

  const escenario = await prisma.escenario.findUnique({ where: { id: d.escenarioId } });
  if (!escenario) return { fieldErrors: { escenarioId: "El escenario no existe." } };

  const creado = await prisma.mantenimiento.create({
    data: {
      escenarioId: d.escenarioId,
      tipo: d.tipo,
      descripcion: d.descripcion ?? null,
      fechaInicio: ini,
      fechaFin: fin,
      costo: d.costo,
      estado: "Programado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { escenarioId: d.escenarioId, tipo: d.tipo, costo: d.costo, estado: "Programado" } });
  revalidatePath("/mantenimiento");
  redirect("/mantenimiento");
}

export async function editarMantenimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar mantenimientos requiere escritura (E) en MOD-023. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Mantenimiento no válido." };
  const actual = await prisma.mantenimiento.findUnique({ where: { id } });
  if (!actual) return { error: "El mantenimiento no existe." };
  if (actual.estado === "Cerrado") return { error: "Un mantenimiento cerrado no puede editarse." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const ini = toDate(d.fechaInicio);
  const fin = toDate(d.fechaFin);
  if (ini && fin && fin < ini) return { fieldErrors: { fechaFin: "La fecha fin no puede ser anterior a la de inicio." } };

  const escenario = await prisma.escenario.findUnique({ where: { id: d.escenarioId } });
  if (!escenario) return { fieldErrors: { escenarioId: "El escenario no existe." } };

  await prisma.mantenimiento.update({
    where: { id },
    data: {
      escenarioId: d.escenarioId,
      tipo: d.tipo,
      descripcion: d.descripcion ?? null,
      fechaInicio: ini,
      fechaFin: fin,
      costo: d.costo,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { escenarioId: d.escenarioId, tipo: d.tipo, costo: d.costo } });
  revalidatePath("/mantenimiento");
  redirect(`/mantenimiento/${id}`);
}

// KPI-029b "mantenimientos a tiempo": el campo cerradoATiempo se fija al cerrar el
// mantenimiento (Sí/No, elegido por quien cierra) y alimenta el indicador de
// cumplimiento de cierres oportunos del módulo de infraestructura.
export async function cerrarMantenimiento(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cerrar mantenimientos requiere escritura (E) en MOD-023. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const mant = await prisma.mantenimiento.findUnique({ where: { id } });
  if (!mant) throw new Error("El mantenimiento no existe.");
  if (mant.estado === "Cerrado") {
    redirect(`/mantenimiento/${id}`);
  }

  const cerradoATiempo = String(fd.get("cerradoATiempo") ?? "") === "true";

  await prisma.mantenimiento.update({
    where: { id },
    data: { estado: "Cerrado", cerradoATiempo, fechaFin: mant.fechaFin ?? new Date() },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "cerrar", modulo: MOD, registroId: id, valorAnterior: { estado: mant.estado }, valorNuevo: { estado: "Cerrado", cerradoATiempo } });
  revalidatePath("/mantenimiento");
  redirect(`/mantenimiento/${id}`);
}
